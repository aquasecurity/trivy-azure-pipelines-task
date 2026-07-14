/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react';
import {
  BuildRestClient,
  BuildServiceIds,
  BuildStatus,
  IBuildPageData,
  IBuildPageDataService,
} from 'azure-devops-extension-api/Build';
import * as SDK from 'azure-devops-extension-sdk';
import * as API from 'azure-devops-extension-api';
import {
  CommonServiceIds,
  IProjectInfo,
  IProjectPageService,
} from 'azure-devops-extension-api';
import {
  Attachment,
  TimelineRecord,
  TimelineRecordState,
} from 'azure-devops-extension-api/Build/Build';
import { Report, AssuranceReport } from './trivy';
import { Loading } from './Loading';
import { ReportsPane } from './ReportsPane';
import { Crash } from './Crash';
import {
  formatApiError,
  getOptionalAttachments,
  parseAttachmentSelfLink,
} from './attachmentUtils';

type AppState = {
  status: TimelineRecordState;
  error: string;
  reports: Report[];
  assuranceReports: AssuranceReport[];
  sdkReady: boolean;
};

interface AppProps {
  checkInterval: number;
}

export class App extends React.Component<AppProps, AppState> {
  private buildClient: BuildRestClient | undefined;
  private project: IProjectInfo | undefined;
  private buildPageData: IBuildPageData | undefined;
  public props: AppProps;

  constructor(props: AppProps) {
    super(props);
    if (props.checkInterval == 0) {
      props.checkInterval = 5000;
    }
    this.props = props;
    this.state = {
      sdkReady: false,
      status: TimelineRecordState.Pending,
      error: '',
      reports: [],
      assuranceReports: [],
    };
  }

  async check() {
    if (
      !this.buildClient ||
      !this.project ||
      !this.buildPageData ||
      !this.buildPageData.build
    ) {
      this.setError(
        'Build client, project, or build page data is not initialized.'
      );
      return;
    }
    const projectId = this.project.id;
    const buildClient = this.buildClient;
    const build = await buildClient.getBuild(
      projectId,
      this.buildPageData.build.id
    );
    // if the build isn't running/finished, try again shortly
    if (
      (build.status & BuildStatus.Completed) === 0 &&
      (build.status & BuildStatus.InProgress) === 0
    ) {
      this.setState({ status: TimelineRecordState.Pending });
      setTimeout(this.check.bind(this), this.props.checkInterval);
      return;
    }

    const timeline = await buildClient.getBuildTimeline(projectId, build.id);
    const records: TimelineRecord[] = [];
    timeline.records.forEach(function (record: TimelineRecord) {
      if (
        record.type == 'Task' &&
        (record.task?.name == 'trivy' || record.task?.name == 'trivy-dev')
      ) {
        records.push(record);
      }
    });
    if (records.length === 0) {
      setTimeout(this.check.bind(this), this.props.checkInterval);
      return;
    }
    let worstState: TimelineRecordState = 2;
    records.forEach(function (record: TimelineRecord) {
      if (record.state < worstState) {
        worstState = record.state;
      }
    });
    if (worstState !== TimelineRecordState.Completed) {
      this.setState({ status: worstState });
      setTimeout(this.check.bind(this), this.props.checkInterval);
      return;
    }
    const jsonAttachments = await getOptionalAttachments(
      buildClient,
      projectId,
      build.id,
      ['JSON_RESULT']
    );
    if (jsonAttachments.length === 0) {
      this.setState({
        error:
          'No attachments found: cannot load results. Did Trivy run properly?',
      });
      return;
    }

    this.setState({ status: worstState });

    const reportTypes = {
      asffReport: 'ASFF',
      cosignReport: 'Cosign',
      cyclonedxReport: 'CycloneDX',
      githubReport: 'GitHub',
      htmlReport: 'HTML',
      junitReport: 'JUnit',
      sarifReport: 'SARIF',
      spdxjsonReport: 'SPDX JSON',
      spdxReport: 'SPDX',
      tableReport: 'Table',
    };
    type ReportType = keyof typeof reportTypes;

    const additionalAttachments = await getOptionalAttachments(
      buildClient,
      projectId,
      build.id,
      Object.keys(reportTypes)
    );

    await Promise.all(
      jsonAttachments.map(async (attachment: Attachment) => {
        const parsedAttachment = parseAttachmentSelfLink(
          attachment._links.self.href
        );
        if (!parsedAttachment) {
          console.log(`Unable to parse attachment URL for: ${attachment.name}`);
          return;
        }

        const record = records.find(
          (timelineRecord) => timelineRecord.id === parsedAttachment.recordId
        );
        if (!record) {
          console.log(`Record not found for attachment: ${attachment.name}`);
          return;
        }

        try {
          const buffer = await buildClient.getAttachment(
            projectId,
            build.id,
            timeline.id,
            record.id,
            'JSON_RESULT',
            attachment.name
          );
          const report = this.decodeReport(buffer) as Report;
          if (!report.DownloadReports) {
            report.DownloadReports = [];
          }

          if (record.name) {
            report.DisplayName = record.name;
          }
          report.DownloadReports.push({
            Name: 'JSON',
            Url: attachment._links.self.href,
          });

          additionalAttachments
            .filter((reportAttachment) =>
              reportAttachment._links.self.href.includes(
                parsedAttachment.recordId
              )
            )
            .forEach((reportAttachment) => {
              const attachmentUrl = reportAttachment._links.self.href;
              const parsedReportAttachment =
                parseAttachmentSelfLink(attachmentUrl);
              if (!parsedReportAttachment) {
                return;
              }

              const reportType =
                reportTypes[
                  parsedReportAttachment.attachmentType as ReportType
                ];
              if (!reportType) {
                return;
              }

              report.DownloadReports.push({
                Name: reportType,
                Url: attachmentUrl,
              });
            });

          this.setState((prevState: any) => ({
            reports: [...prevState.reports, report],
          }));
        } catch (e) {
          console.log(
            'Failed to decode results attachment ' + formatApiError(e)
          );
        }
      })
    );

    const assuranceAttachments = await getOptionalAttachments(
      buildClient,
      projectId,
      build.id,
      ['ASSURANCE_RESULT']
    );
    if (assuranceAttachments.length > 0) {
      assuranceAttachments.forEach(
        function (attachment: Attachment) {
          records.forEach(
            async function (record: TimelineRecord) {
              try {
                const buffer = await buildClient.getAttachment(
                  projectId,
                  build.id,
                  timeline.id,
                  record.id,
                  'ASSURANCE_RESULT',
                  attachment.name
                );
                const report = this.decodeAssuranceReport(buffer);
                this.setState((prevState: any) => ({
                  assuranceReports: [...prevState.assuranceReports, report],
                }));
              } catch {
                console.log('Failed to decode assurance attachment');
              }
            }.bind(this)
          );
        }.bind(this)
      );
    }
  }

  setError(msg: string) {
    this.setState({ error: msg });
  }

  async initializeAfterSdkReady() {
    const buildPageService: IBuildPageDataService = await SDK.getService(
      BuildServiceIds.BuildPageDataService
    );
    if (!buildPageService) {
      this.setError('Failed to get build page data service.');
      return;
    }

    this.buildPageData = await buildPageService.getBuildPageData();
    const projectService = await SDK.getService<IProjectPageService>(
      CommonServiceIds.ProjectPageService
    );

    this.project = await projectService.getProject();
    this.buildClient = API.getClient(BuildRestClient);
    await this.check();
  }

  async componentDidMount() {
    setTimeout(
      function () {
        if (!this.state.sdkReady) {
          this.setError('Azure DevOps SDK failed to initialise.');
        }
      }.bind(this),
      5000
    );
    try {
      await SDK.init();
      await SDK.ready();
      this.setState({ sdkReady: true });
      try {
        await this.initializeAfterSdkReady();
      } catch (e) {
        this.setError(
          'Failed to load Trivy results from Azure DevOps: ' + formatApiError(e)
        );
      }
    } catch (e) {
      this.setError(
        'Azure DevOps SDK failed to enter a ready state: ' + formatApiError(e)
      );
    }
  }

  decodeReport(buffer: ArrayBuffer): Report {
    let output = '';
    const arr = new Uint8Array(buffer);
    const len = arr.byteLength;
    for (let i = 0; i < len; i++) {
      output += String.fromCharCode(arr[i]);
    }
    return JSON.parse(output) as Report;
  }

  decodeAssuranceReport(buffer: ArrayBuffer): AssuranceReport {
    let output = '';
    const arr = new Uint8Array(buffer);
    const len = arr.byteLength;
    for (let i = 0; i < len; i++) {
      output += String.fromCharCode(arr[i]);
    }
    return JSON.parse(output);
  }

  render() {
    if (
      this.state.status == TimelineRecordState.Completed ||
      this.state.reports.length > 0
    ) {
      return (
        <ReportsPane
          reports={this.state.reports}
          assuranceReports={this.state.assuranceReports}
        />
      );
    }

    return this.state.error !== '' ? (
      <Crash message={this.state.error} />
    ) : (
      <Loading status={this.state.status} />
    );
  }
}
