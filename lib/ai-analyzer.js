import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const SUBSCRIPTION_EXTRACTION_PROMPT = `당신은 이메일에서 디지털 구독 정보를 추출하는 전문 분석가입니다.

다음 이메일들을 분석하고, 각 이메일에서 발견된 구독/정기결제 정보를 JSON 배열로 반환하세요.

각 구독에 대해 다음 필드를 추출하세요:
- service_name: 서비스명 (한글 병기)
- amount: 결제 금액 (원 단위 숫자만)
- currency: 통화 코드 (KRW, USD 등)
- billing_cycle: 결제 주기 (monthly, yearly, weekly)
- billing_day: 결제일 (1-31, 알 수 없으면 null)
- category: 카테고리 (streaming, music, cloud, productivity, ai, design, developer, reading, membership, gaming, fitness, news, other)
- confidence: 이것이 실제 정기 구독인지 확신도 (0.0~1.0)
- email_id: 해당 이메일의 ID
- sender: 발신자 이메일

구독이 아닌 일반 결제 이메일은 제외하세요.
반드시 유효한 JSON 배열만 반환하세요. 다른 텍스트는 포함하지 마세요.

이메일 데이터:
`;

export async function analyzeEmailsForSubscriptions(emails) {
    if (!process.env.GEMINI_API_KEY) {
        console.warn('GEMINI_API_KEY not set, using pattern-based detection');
        return patternBasedDetection(emails);
    }

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        // Process in batches of 10
        const results = [];
        for (let i = 0; i < emails.length; i += 10) {
            const batch = emails.slice(i, i + 10);
            const emailData = batch.map(e => ({
                id: e.id,
                subject: e.subject,
                from: e.from,
                date: e.date,
                snippet: e.snippet,
                body: e.body?.substring(0, 1500),
            }));

            const prompt = SUBSCRIPTION_EXTRACTION_PROMPT + JSON.stringify(emailData, null, 2);
            const result = await model.generateContent(prompt);
            const text = result.response.text();

            try {
                const jsonMatch = text.match(/\[[\s\S]*\]/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    results.push(...parsed);
                }
            } catch (parseError) {
                console.error('Failed to parse AI response:', parseError);
                // Fallback to pattern-based for this batch
                results.push(...patternBasedDetection(batch));
            }
        }

        return deduplicateSubscriptions(results);
    } catch (error) {
        console.error('AI analysis error:', error);
        return patternBasedDetection(emails);
    }
}

const CARD_ANALYSIS_PROMPT = `당신은 카드 명세서에서 정기 구독 결제를 식별하는 전문 분석가입니다.

다음 카드 명세서 내용을 분석하고, 정기 구독으로 보이는 결제들을 JSON 배열로 반환하세요.

각 항목에 대해:
- service_name: 서비스명 (한글 병기)
- amount: 결제 금액 (원 단위 숫자만)
- currency: 통화 코드
- billing_cycle: 추정 결제 주기
- category: 카테고리
- confidence: 확신도 (0.0~1.0)
- merchant_name: 원본 가맹점명

정기 구독이 아닌 일반 결제는 제외하세요.
반드시 유효한 JSON 배열만 반환하세요.

명세서 내용:
`;

export async function analyzeCardStatement(textContent) {
    if (!process.env.GEMINI_API_KEY) {
        return [];
    }

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const prompt = CARD_ANALYSIS_PROMPT + textContent.substring(0, 8000);
        const result = await model.generateContent(prompt);
        const text = result.response.text();

        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return [];
    } catch (error) {
        console.error('Card analysis error:', error);
        return [];
    }
}

// Fallback: Pattern-based detection when Gemini API is unavailable
function patternBasedDetection(emails) {
    const subscriptionPatterns = [
        { regex: /Netflix/i, name: 'Netflix', category: 'streaming' },
        { regex: /YouTube\s*Premium/i, name: 'YouTube Premium', category: 'streaming' },
        { regex: /Spotify/i, name: 'Spotify', category: 'music' },
        { regex: /Apple\s*(Music|One|TV|Arcade|iCloud)/i, name: 'Apple', category: 'streaming' },
        { regex: /Disney\+|Disney\s*Plus/i, name: 'Disney+', category: 'streaming' },
        { regex: /ChatGPT|OpenAI/i, name: 'ChatGPT Plus', category: 'ai' },
        { regex: /Claude|Anthropic/i, name: 'Claude Pro', category: 'ai' },
        { regex: /Notion/i, name: 'Notion', category: 'productivity' },
        { regex: /Figma/i, name: 'Figma', category: 'design' },
        { regex: /GitHub/i, name: 'GitHub', category: 'developer' },
        { regex: /Adobe/i, name: 'Adobe CC', category: 'design' },
        { regex: /Microsoft\s*365|Office\s*365/i, name: 'Microsoft 365', category: 'productivity' },
        { regex: /Google\s*One/i, name: 'Google One', category: 'cloud' },
        { regex: /쿠팡\s*(플레이|로켓와우|와우)/i, name: '쿠팡', category: 'membership' },
        { regex: /네이버\s*플러스|NAVER\s*Plus/i, name: '네이버 플러스 멤버십', category: 'membership' },
        { regex: /멜론|Melon/i, name: '멜론', category: 'music' },
        { regex: /티빙|TVING/i, name: 'TVING', category: 'streaming' },
        { regex: /웨이브|wavve/i, name: '웨이브', category: 'streaming' },
        { regex: /밀리/i, name: '밀리의 서재', category: 'reading' },
        { regex: /리디|RIDI/i, name: 'RIDI Select', category: 'reading' },
        { regex: /Slack/i, name: 'Slack', category: 'productivity' },
    ];

    const amountRegex = /(?:₩|원|KRW)\s*([\d,]+)|(?:\$|USD)\s*([\d.]+)|([\d,]+)\s*(?:원|₩)/;

    const results = [];
    for (const email of emails) {
        const text = `${email.subject || ''} ${email.from || ''} ${email.snippet || ''} ${email.body || ''}`;

        for (const pattern of subscriptionPatterns) {
            if (pattern.regex.test(text)) {
                const amountMatch = text.match(amountRegex);
                let amount = 0;
                let currency = 'KRW';
                if (amountMatch) {
                    if (amountMatch[1]) amount = parseInt(amountMatch[1].replace(/,/g, ''));
                    else if (amountMatch[2]) { amount = Math.round(parseFloat(amountMatch[2]) * 1400); currency = 'USD'; }
                    else if (amountMatch[3]) amount = parseInt(amountMatch[3].replace(/,/g, ''));
                }

                results.push({
                    service_name: pattern.name,
                    amount,
                    currency,
                    billing_cycle: 'monthly',
                    billing_day: null,
                    category: pattern.category,
                    confidence: 0.7,
                    email_id: email.id,
                    sender: email.from,
                });
                break; // One match per email
            }
        }
    }

    return deduplicateSubscriptions(results);
}

function deduplicateSubscriptions(subs) {
    const map = new Map();
    for (const sub of subs) {
        const key = sub.service_name?.toLowerCase().trim();
        if (!key) continue;
        const existing = map.get(key);
        if (!existing || (sub.confidence > existing.confidence) || (sub.amount > 0 && existing.amount === 0)) {
            map.set(key, sub);
        }
    }
    return Array.from(map.values());
}
