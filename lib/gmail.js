import { google } from 'googleapis';

export function getGmailClient(accessToken) {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    return google.gmail({ version: 'v1', auth });
}

const SUBSCRIPTION_QUERIES = [
    '(subject:"구독" OR subject:"결제" OR subject:"subscription" OR subject:"billing" OR subject:"invoice" OR subject:"receipt" OR subject:"payment" OR subject:"영수증" OR subject:"결제 완료" OR subject:"갱신" OR subject:"renewal")',
];

export async function scanForSubscriptionEmails(accessToken, options = {}) {
    const gmail = getGmailClient(accessToken);
    const { maxResults = 200, afterDate } = options;

    let query = SUBSCRIPTION_QUERIES[0];
    if (afterDate) {
        query += ` after:${afterDate}`;
    }

    const allMessages = [];
    let pageToken;

    do {
        const response = await gmail.users.messages.list({
            userId: 'me',
            q: query,
            maxResults: Math.min(maxResults - allMessages.length, 100),
            pageToken,
        });

        if (response.data.messages) {
            allMessages.push(...response.data.messages);
        }
        pageToken = response.data.nextPageToken;
    } while (pageToken && allMessages.length < maxResults);

    return allMessages;
}

export async function getEmailDetails(accessToken, messageId) {
    const gmail = getGmailClient(accessToken);

    const response = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
    });

    const headers = response.data.payload.headers;
    const getHeader = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';

    const body = extractBody(response.data.payload);

    return {
        id: messageId,
        subject: getHeader('Subject'),
        from: getHeader('From'),
        to: getHeader('To'),
        date: getHeader('Date'),
        body: body.substring(0, 3000), // Limit body to avoid token overflow
        snippet: response.data.snippet,
    };
}

function extractBody(payload) {
    if (payload.body?.data) {
        return Buffer.from(payload.body.data, 'base64').toString('utf-8');
    }

    if (payload.parts) {
        // Prefer plain text
        const textPart = payload.parts.find(p => p.mimeType === 'text/plain');
        if (textPart?.body?.data) {
            return Buffer.from(textPart.body.data, 'base64').toString('utf-8');
        }

        // Fall back to HTML
        const htmlPart = payload.parts.find(p => p.mimeType === 'text/html');
        if (htmlPart?.body?.data) {
            const html = Buffer.from(htmlPart.body.data, 'base64').toString('utf-8');
            return stripHtml(html);
        }

        // Check nested parts
        for (const part of payload.parts) {
            if (part.parts) {
                const nested = extractBody(part);
                if (nested) return nested;
            }
        }
    }

    return '';
}

function stripHtml(html) {
    return html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
}
