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
    const build = await this.buildClient.getBuild(
      this.project.id,
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

    const timeline = await this.buildClient.getBuildTimeline(
      this.project.id,
      build.id
    );
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
    const jsonAttachments = await this.buildClient.getAttachments(
      this.project.id,
      build.id,
      'JSON_RESULT'
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

    // get all supported report attachments for the build once
    const additionalAttachments: Attachment[] = [];
    for (const key of Object.keys(reportTypes)) {
      const reportAttachments = await this.buildClient.getAttachments(
        this.project.id,
        build.id,
        key
      );
      additionalAttachments.push(...reportAttachments);
    }

    jsonAttachments.forEach(
      async function (attachment: Attachment) {
        // get the record id from attachment url
        const jsonAttachementUrl = attachment._links.self.href;
        // handle legacy url https://{organization}.visualstudio.com
        const recordId = jsonAttachementUrl.includes('dev.azure.com')
          ? jsonAttachementUrl.split('/')[10]
          : jsonAttachementUrl.split('/')[9];
        // get the record from the timeline
        const record = records.find((record) => record.id === recordId);
        if (!record) {
          console.log(`Record not found for attachment: ${attachment.name}`);
          return;
        }
        try {
          const buffer = await this.buildClient.getAttachment(
            this.project.id,
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
          // Add json report to the report downloads by default
          report.DownloadReports.push({
            Name: 'JSON',
            Url: attachment._links.self.href,
          });

          // check if there are any other attachments with the same record id
          // and add them to the downloads
          additionalAttachments
            .filter((reportAttachment) =>
              reportAttachment._links.self.href.includes(recordId)
            )
            .forEach((reportAttachment) => {
              // get the report type from attachment url
              const attachmentUrl = reportAttachment._links.self.href;
              console.log(
                `Found ${attachmentUrl} for report ${report.DisplayName}`
              );
              // handle legacy url https://{organization}.visualstudio.com
              const attachmentType = attachmentUrl.includes('dev.azure.com')
                ? attachmentUrl.split('/')[12]
                : attachmentUrl.split('/')[11];
              report.DownloadReports.push({
                Name: reportTypes[attachmentType as ReportType],
                Url: attachmentUrl,
              });
            });

          this.setState((prevState: any) => ({
            reports: [...prevState.reports, report],
          }));
        } catch (e) {
          console.log(
            'Failed to decode results attachment ' + JSON.stringify(e)
          );
        }
      }.bind(this)
    );

    // check if we have assurance results
    const assuranceAttachments = await this.buildClient.getAttachments(
      this.project.id,
      build.id,
      'ASSURANCE_RESULT'
    );
    if (assuranceAttachments.length > 0) {
      assuranceAttachments.forEach(
        function (attachment: Attachment) {
          records.forEach(
            async function (record: TimelineRecord) {
              try {
                const buffer = await this.buildClient.getAttachment(
                  this.project.id,
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

  async componentDidMount() {
    setTimeout(
      function () {
        if (!this.state.sdkReady) {
          this.setError('Azure DevOps SDK failed to initialise.');
        }
      }.bind(this),
      5000
    );
    SDK.init()
      .then(() => {
        SDK.ready()
          .then(async () => {
            this.setState({ sdkReady: true });
            const buildPageService: IBuildPageDataService =
              await SDK.getService(BuildServiceIds.BuildPageDataService);
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
          })
          .catch((e) =>
            this.setError.bind(this)(
              'Azure DevOps SDK failed to enter a ready state: ' +
                JSON.stringify(e)
            )
          );
      })
      .catch((e) =>
        this.setError.bind(this)(
          'Azure DevOps SDK failed to initialise: ' + JSON.stringify(e)
        )
      );
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
    return this.state.status == TimelineRecordState.Completed ? (
      <ReportsPane
        reports={this.state.reports}
        assuranceReports={this.state.assuranceReports}
      />
    ) : this.state.error !== '' ? (
      <Crash message={this.state.error} />
    ) : (
      <Loading status={this.state.status} />
    );
  }
}
