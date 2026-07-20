export type AttachmentLink = {
  name: string;
  _links: {
    self: {
      href: string;
    };
  };
};

export type AttachmentClient = {
  getAttachments(
    project: string,
    buildId: number,
    type: string
  ): Promise<AttachmentLink[]>;
};

export type ParsedAttachmentLink = {
  recordId: string;
  attachmentType: string;
};

const RECORDS_SEGMENT = 'records';
const ATTACHMENTS_SEGMENT = 'attachments';

export function parseAttachmentSelfLink(
  href: string
): ParsedAttachmentLink | null {
  const segments = href.split('/').filter((segment) => segment.length > 0);

  const recordsIndex = segments.indexOf(RECORDS_SEGMENT);
  if (recordsIndex >= 0 && segments.length > recordsIndex + 3) {
    return {
      recordId: segments[recordsIndex + 1],
      attachmentType: segments[recordsIndex + 3],
    };
  }

  const attachmentsIndex = segments.indexOf(ATTACHMENTS_SEGMENT);
  if (attachmentsIndex >= 2 && segments.length > attachmentsIndex + 1) {
    return {
      recordId: segments[attachmentsIndex - 1],
      attachmentType: segments[attachmentsIndex + 1],
    };
  }

  return null;
}

export function isNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const status = (error as { status?: number }).status;
  return status === 404;
}

export async function getOptionalAttachments(
  buildClient: AttachmentClient,
  projectId: string,
  buildId: number,
  attachmentTypes: string[]
): Promise<AttachmentLink[]> {
  const attachments: AttachmentLink[] = [];

  for (const attachmentType of attachmentTypes) {
    try {
      const reportAttachments = await buildClient.getAttachments(
        projectId,
        buildId,
        attachmentType
      );
      attachments.push(...reportAttachments);
    } catch (error) {
      if (!isNotFoundError(error)) {
        throw error;
      }
    }
  }

  return attachments;
}

export function formatApiError(error: unknown): string {
  if (!error) {
    return 'Unknown error';
  }

  if (typeof error === 'string') {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}
