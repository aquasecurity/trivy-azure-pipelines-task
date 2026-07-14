const assert = require('assert');
const {
  formatApiError,
  getOptionalAttachments,
  isNotFoundError,
  parseAttachmentSelfLink,
} = require('../test-dist/attachmentUtils');

function test(name, fn) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

async function run() {
  test('parseAttachmentSelfLink parses dev.azure.com URLs', () => {
    const href =
      'https://dev.azure.com/org/project/_apis/build/builds/123/timeline-id/record-id/attachments/JSON_RESULT/trivy-results.json';

    assert.deepStrictEqual(parseAttachmentSelfLink(href), {
      recordId: 'record-id',
      attachmentType: 'JSON_RESULT',
    });
  });

  test('parseAttachmentSelfLink parses visualstudio.com URLs', () => {
    const href =
      'https://org.visualstudio.com/project/_apis/build/builds/123/timeline-id/record-id/attachments/sarifReport/report.json';

    assert.deepStrictEqual(parseAttachmentSelfLink(href), {
      recordId: 'record-id',
      attachmentType: 'sarifReport',
    });
  });

  test('parseAttachmentSelfLink parses timeline records URLs', () => {
    const href =
      'https://dev.azure.com/org/project/_apis/build/builds/123/timeline/timeline-id/records/record-id/attachments/JSON_RESULT/trivy-results.json';

    assert.deepStrictEqual(parseAttachmentSelfLink(href), {
      recordId: 'record-id',
      attachmentType: 'JSON_RESULT',
    });
  });

  test('parseAttachmentSelfLink returns null for unsupported URLs', () => {
    assert.strictEqual(
      parseAttachmentSelfLink('https://example.com/attachments'),
      null
    );
  });

  test('isNotFoundError detects Azure DevOps 404 errors', () => {
    assert.strictEqual(
      isNotFoundError({
        name: 'TFS.WebApi.Exception',
        status: 404,
        message: '404: Not Found',
      }),
      true
    );
    assert.strictEqual(isNotFoundError({ status: 500 }), false);
  });

  const attachments = await getOptionalAttachments(
    {
      getAttachments: async (_project, _buildId, type) => {
        if (type === 'sarifReport') {
          return [
            {
              name: 'report.json',
              _links: { self: { href: 'https://example.com' } },
            },
          ];
        }

        throw {
          name: 'TFS.WebApi.Exception',
          status: 404,
          message: '404: Not Found',
        };
      },
    },
    'project-id',
    42,
    ['sarifReport', 'htmlReport']
  );

  assert.strictEqual(attachments.length, 1);
  assert.strictEqual(attachments[0].name, 'report.json');
  console.log('ok getOptionalAttachments ignores missing attachment types');

  await assert.rejects(
    () =>
      getOptionalAttachments(
        {
          getAttachments: async () => {
            throw { status: 500, message: 'Server error' };
          },
        },
        'project-id',
        42,
        ['sarifReport']
      ),
    (error) => error.status === 500
  );
  console.log('ok getOptionalAttachments rethrows non-404 errors');

  assert.strictEqual(
    formatApiError({
      name: 'TFS.WebApi.Exception',
      status: 404,
      message: '404: Not Found',
    }),
    '{"name":"TFS.WebApi.Exception","status":404,"message":"404: Not Found"}'
  );
  console.log('ok formatApiError serializes API errors');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
