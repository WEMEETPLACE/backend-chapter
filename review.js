/**
 * AI Code Review Script (Gemini)
 *
 * GitHub Actions에서 실행되어 PR의 diff를 Gemini API로 분석하고,
 * 점수와 피드백을 PR 코멘트로 남깁니다.
 *
 * 환경 변수:
 *   GEMINI_API_KEY  - Google AI (Gemini) API 키
 *   GITHUB_TOKEN    - GitHub 토큰 (Actions에서 자동 제공)
 *   PR_NUMBER       - PR 번호
 *   REPO_FULL_NAME  - owner/repo 형식
 *   PR_TITLE        - PR 제목
 *   PR_AUTHOR       - PR 작성자
 */

const fs = require("fs");

// ============================================
// 설정
// ============================================

/** diff 최대 길이 (토큰 절약) */
const MAX_DIFF_LENGTH = 10000;

/** Gemini 모델 */
const GEMINI_MODEL = "gemini-2.5-flash";

/** 평가 기준 프롬프트 */
const REVIEW_PROMPT = `당신은 10년차 시니어 프론트엔드 개발자이자 게임 개발 전문가입니다.
아래는 "Snake 게임 만들기" 과제의 Pull Request 코드 변경사항(diff)입니다.

## 과제 요구사항
참가자들은 아래 요구사항에 맞춰 Snake 게임을 구현해야 합니다:

### 필수 기능 (기능 완성도 평가 대상)
- 캔버스 또는 DOM 기반 Snake 게임 구현
- 방향키(또는 WASD)로 뱀 조작
- 먹이를 먹으면 뱀이 길어짐
- 벽이나 자기 몸에 부딪히면 게임 오버
- 현재 점수 표시
- 게임 오버 시 재시작 기능

### 평가 기준

1. **기능 완성도** (40점)
   - 뱀 이동이 정상 동작하는가 (10점)
   - 먹이 생성 및 섭취 로직이 올바른가 (10점)
   - 충돌 감지(벽, 자기 몸)가 정확한가 (10점)
   - 점수 표시 및 게임 오버/재시작이 구현되었는가 (10점)

2. **코드 품질** (30점)
   - 함수/모듈로 적절히 분리되었는가 (10점)
   - 게임 루프가 효율적으로 구현되었는가 (requestAnimationFrame 또는 setInterval) (10점)
   - 에러 처리, 엣지 케이스 대응 (10점)

3. **가독성** (20점)
   - 변수/함수 네이밍이 명확한가 (7점)
   - 코드 포맷팅이 일관적인가 (7점)
   - 적절한 주석이 있는가 (6점)

4. **추가 기능** (10점)
   - 요구사항 외 창의적 기능 (속도 조절, 스킨, 사운드, 최고점수 저장 등)
   - UI/UX 개선 (디자인, 애니메이션, 반응형 등)
   - 코드 확장성 (설정 분리, 난이도 조절 등)

## 채점 규칙
- 구현되지 않은 필수 기능이 있으면 해당 항목 0점
- 부분 구현은 비율에 따라 부분 점수
- 버그가 있으면 해당 항목에서 감점
- 총점은 반드시 각 항목 점수의 합과 일치해야 함

## 응답 형식
반드시 아래 JSON 형식으로만 응답하세요.

{
  "total": 총점(숫자),
  "scores": {
    "functionality": { "score": 점수, "max": 40 },
    "quality": { "score": 점수, "max": 30 },
    "readability": { "score": 점수, "max": 20 },
    "extra": { "score": 점수, "max": 10 }
  },
  "feedback": "전체 피드백 (1-2문장)",
  "strengths": ["강점1", "강점2"],
  "improvements": ["개선점1", "개선점2"]
}

중요: 반드시 위 JSON만 출력하세요. 설명, 마크다운, 코드블록 없이 순수 JSON만 반환하세요. 각 문자열은 한국어로 짧게 작성하세요.`;

// ============================================
// 환경 변수 읽기
// ============================================

const {
  GEMINI_API_KEY,
  GITHUB_TOKEN,
  PR_NUMBER,
  REPO_FULL_NAME,
  PR_TITLE = "",
  PR_AUTHOR = "",
} = process.env;

// ============================================
// 메인 함수
// ============================================

async function main() {
  console.log(`\n🔍 AI Code Review 시작 (Gemini)`);
  console.log(`   PR #${PR_NUMBER}: ${PR_TITLE}`);
  console.log(`   Author: ${PR_AUTHOR}\n`);

  // 1. 환경 변수 검증
  if (!GEMINI_API_KEY) {
    console.error("❌ GEMINI_API_KEY가 설정되지 않았습니다.");
    await postFallbackComment("GEMINI_API_KEY가 설정되지 않았습니다.");
    process.exit(1);
  }

  // 2. diff 파일 읽기
  const diff = readDiff();
  if (!diff) {
    console.log("ℹ️  변경된 코드가 없습니다. 리뷰를 건너뜁니다.");
    return;
  }
  console.log(`📄 Diff 크기: ${diff.length}자\n`);

  // 3. Gemini API로 리뷰 요청
  let review;
  try {
    review = await requestReview(diff);
    console.log("✅ Gemini 리뷰 완료\n");
  } catch (err) {
    console.error("❌ Gemini API 호출 실패:", err.message);
    await postFallbackComment(`Gemini API 호출 중 오류가 발생했습니다: ${err.message}`);
    process.exit(1);
  }

  // 4. PR 코멘트 작성
  const comment = formatComment(review);
  await postComment(comment);
  console.log("💬 PR 코멘트 작성 완료!\n");
}

// ============================================
// diff 파일 읽기
// ============================================

function readDiff() {
  const diffPath = "pr_diff.txt";

  if (!fs.existsSync(diffPath)) {
    console.warn("⚠️  pr_diff.txt 파일이 없습니다.");
    return null;
  }

  let diff = fs.readFileSync(diffPath, "utf-8").trim();

  if (!diff) return null;

  // 너무 긴 diff는 잘라내기
  if (diff.length > MAX_DIFF_LENGTH) {
    console.log(`⚠️  Diff가 너무 깁니다. ${MAX_DIFF_LENGTH}자로 잘라냅니다.`);
    diff = diff.slice(0, MAX_DIFF_LENGTH) + "\n\n... (이하 생략, 전체 diff가 너무 길어 일부만 분석)";
  }

  return diff;
}

// ============================================
// Gemini API 호출
// ============================================

async function requestReview(diff) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const body = {
    contents: [
      {
        parts: [
          {
            text: `${REVIEW_PROMPT}\n\n## PR 정보\n- 제목: ${PR_TITLE}\n- 작성자: ${PR_AUTHOR}\n\n## 코드 변경사항 (diff)\n\`\`\`diff\n${diff}\n\`\`\``,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 8192,
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API ${response.status}: ${errorText}`);
  }

  const data = await response.json();

  // 응답 구조 확인
  if (!data.candidates || !data.candidates[0]) {
    console.error("Gemini 응답 전체:", JSON.stringify(data, null, 2));
    throw new Error("Gemini 응답에 candidates가 없습니다.");
  }

  // parts에서 text 타입만 추출 (thinking 파트 제외)
  const parts = data.candidates[0].content.parts;
  const textParts = parts.filter(p => p.text !== undefined && !p.thought);
  const text = textParts.map(p => p.text).join("");

  console.log("📝 Gemini 응답 (처음 500자):", text.slice(0, 500));

  // JSON 파싱 — ```json ... ``` 블록 또는 raw JSON
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = codeBlockMatch ? codeBlockMatch[1] : text;

  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Gemini 응답에서 JSON을 찾을 수 없습니다. 응답: " + text.slice(0, 300));
  }

  return JSON.parse(jsonMatch[0]);
}

// ============================================
// 코멘트 포맷팅
// ============================================

function formatComment(review) {
  const { total, scores, feedback, strengths, improvements } = review;

  // 점수에 따른 등급 이모지
  const grade = getGrade(total);

  // 점수 바 생성
  const bar = (score, max) => {
    const pct = Math.round((score / max) * 10);
    return "█".repeat(pct) + "░".repeat(10 - pct);
  };

  let comment = `## 🤖 AI Code Review\n\n`;
  comment += `> PR: **${PR_TITLE}** by @${PR_AUTHOR}\n\n`;

  // 총점
  comment += `### ${grade.emoji} Total Score: **${total}/100**\n\n`;
  comment += `${grade.message}\n\n`;

  // 항목별 점수
  comment += `### 📊 항목별 점수\n\n`;
  comment += `| 항목 | 점수 | 그래프 |\n`;
  comment += `|------|------|--------|\n`;
  comment += `| 🎯 기능 완성도 | **${scores.functionality.score}/${scores.functionality.max}** | ${bar(scores.functionality.score, scores.functionality.max)} |\n`;
  comment += `| 🏗️ 코드 품질 | **${scores.quality.score}/${scores.quality.max}** | ${bar(scores.quality.score, scores.quality.max)} |\n`;
  comment += `| 📖 가독성 | **${scores.readability.score}/${scores.readability.max}** | ${bar(scores.readability.score, scores.readability.max)} |\n`;
  comment += `| ✨ 추가 기능 | **${scores.extra.score}/${scores.extra.max}** | ${bar(scores.extra.score, scores.extra.max)} |\n\n`;

  // 피드백
  comment += `### 💬 피드백\n\n`;
  comment += `${feedback}\n\n`;

  // 강점
  if (strengths && strengths.length > 0) {
    comment += `### ✅ 강점\n\n`;
    strengths.forEach((s) => {
      comment += `- ${s}\n`;
    });
    comment += `\n`;
  }

  // 개선점
  if (improvements && improvements.length > 0) {
    comment += `### 🔧 개선 제안\n\n`;
    improvements.forEach((s) => {
      comment += `- ${s}\n`;
    });
    comment += `\n`;
  }

  comment += `---\n`;
  comment += `*🤖 Reviewed by Gemini AI | Model: ${GEMINI_MODEL}*`;

  return comment;
}

/** 총점에 따른 등급 */
function getGrade(score) {
  if (score >= 90) return { emoji: "🏆", message: "**Outstanding!** 훌륭한 코드입니다!" };
  if (score >= 80) return { emoji: "🥇", message: "**Great!** 전반적으로 잘 작성된 코드입니다." };
  if (score >= 70) return { emoji: "🥈", message: "**Good.** 몇 가지 개선하면 더 좋아질 코드입니다." };
  if (score >= 60) return { emoji: "🥉", message: "**Fair.** 개선이 필요한 부분이 있습니다." };
  return { emoji: "📝", message: "**Needs Work.** 상당한 개선이 필요합니다." };
}

// ============================================
// GitHub API - PR 코멘트 작성
// ============================================

async function postComment(body) {
  const url = `https://api.github.com/repos/${REPO_FULL_NAME}/issues/${PR_NUMBER}/comments`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ body }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GitHub API ${response.status}: ${errorText}`);
  }
}

/** API 실패 시 fallback 코멘트 */
async function postFallbackComment(errorMsg) {
  if (!GITHUB_TOKEN || !PR_NUMBER || !REPO_FULL_NAME) {
    console.error("GitHub 환경 변수가 없어 fallback 코멘트를 작성할 수 없습니다.");
    return;
  }

  const body =
    `## 🤖 AI Code Review\n\n` +
    `⚠️ 자동 코드 리뷰 중 오류가 발생했습니다.\n\n` +
    `\`\`\`\n${errorMsg}\n\`\`\`\n\n` +
    `수동으로 리뷰를 진행해주세요.\n\n` +
    `---\n*🤖 Gemini AI Review Bot*`;

  try {
    await postComment(body);
  } catch (err) {
    console.error("Fallback 코멘트 작성도 실패:", err.message);
  }
}

// ============================================
// 실행
// ============================================

main().catch((err) => {
  console.error("❌ 예상치 못한 오류:", err);
  process.exit(1);
});
