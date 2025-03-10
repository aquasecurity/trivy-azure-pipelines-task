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
    const attachments = await this.buildClient.getAttachments(
      this.project.id,
      build.id,
      'JSON_RESULT'
    );
    if (attachments.length === 0) {
      this.setState({
        error:
          'No attachments found: cannot load results. Did Trivy run properly?',
      });
      return;
    }

    this.setState({ status: worstState });

    const artifacts = await this.buildClient.getArtifacts(
      this.project.id,
      build.id
    );

    console.log(JSON.stringify(artifacts));

    attachments.forEach(
      function (attachment: Attachment) {
        records.forEach(
          async function (record: TimelineRecord) {
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

              try {
                console.log(
                  'Checking for artifacts for record ' + JSON.stringify(record)
                );
                artifacts
                  .filter((artifact) => artifact.source === record.parentId)
                  .forEach((artifact) => {
                    console.log('Artifact: ' + JSON.stringify(artifact));
                    report.DownloadReports.push({
                      // the name of the report has the task as a prefix so that needs
                      // to be stripped
                      Name: artifact.name.replace(artifact.source, ''),
                      Url: artifact.resource.downloadUrl,
                    });
                  });
              } catch {
                console.log('Failed to decode report artifact');
              }

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
