import { PROTECTION_TEST_PLAN, TEST_PLAN_SAFETY_RULES, type TestSeverity } from '@/data/fluxTestPlan';
import type { EvidenceRow } from '@/hooks/usePcbTestEvidence';

const sevLabel: Record<TestSeverity, string> = {
  blocker: 'বাধ্যতামূলক',
  major: 'গুরুত্বপূর্ণ',
  advisory: 'পরামর্শ',
};

export type ReportInput = {
  tested: Record<string, boolean>;
  evidence: EvidenceRow[];
  urls: Record<string, string>;
  boardSerial?: string;
};

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** প্রমাণসহ প্রিন্টযোগ্য HTML রিপোর্ট */
export function buildEvidenceReportHtml(input: ReportInput): string {
  const { tested, evidence, urls, boardSerial } = input;
  const allSteps = PROTECTION_TEST_PLAN.flatMap((s) => s.steps);
  const done = allSteps.filter((s) => tested[s.id]).length;
  const withEvidence = allSteps.filter((s) => evidence.some((e) => e.step_id === s.id)).length;

  const sections = PROTECTION_TEST_PLAN.map((section) => {
    const steps = section.steps
      .map((step, idx) => {
        const files = evidence.filter((e) => e.step_id === step.id);
        const media = files.length
          ? `<div class="media">${files
              .map((f) => {
                const url = urls[f.file_path] || '';
                const isImg = (f.mime_type || '').startsWith('image/');
                return isImg
                  ? `<figure><img src="${esc(url)}" alt="${esc(f.file_name)}"/><figcaption>${esc(f.file_name)}</figcaption></figure>`
                  : `<figure class="pdf"><a href="${esc(url)}">📄 ${esc(f.file_name)}</a><figcaption>PDF প্রমাণ</figcaption></figure>`;
              })
              .join('')}</div>`
          : `<p class="noev">⚠ কোনো প্রমাণ আপলোড করা হয়নি</p>`;
        return `<div class="step">
  <h4>${tested[step.id] ? '✅' : '⬜'} ধাপ ${idx + 1}: ${esc(step.title)} <span class="sev ${step.severity}">${sevLabel[step.severity]}</span>${step.danger ? '<span class="sev blocker">AC লাইভ</span>' : ''}</h4>
  <p><b>কীভাবে:</b> ${esc(step.how)}</p>
  <p class="pass"><b>পাস শর্ত:</b> ${esc(step.pass)}</p>
  ${media}
</div>`;
      })
      .join('');
    return `<section><h3>${esc(section.title)}</h3><p class="intro">${esc(section.intro)}</p>${steps}</section>`;
  }).join('');

  return `<!doctype html><html lang="bn"><head><meta charset="utf-8"/>
<title>FarmEye v8 — সুরক্ষা টেস্ট রিপোর্ট (প্রমাণসহ)</title>
<style>
 body{font-family:'Nikosh','Segoe UI',sans-serif;margin:32px;color:#111;line-height:1.6}
 h1{color:#1F7A3E;margin-bottom:4px} h3{color:#1F7A3E;border-bottom:2px solid #1F7A3E33;padding-bottom:4px;margin-top:28px}
 .meta{color:#555;font-size:13px} .summary{display:flex;gap:16px;flex-wrap:wrap;margin:16px 0}
 .card{border:1px solid #ddd;border-radius:8px;padding:10px 14px;font-size:13px}
 .step{border:1px solid #e5e5e5;border-radius:8px;padding:12px;margin:12px 0;page-break-inside:avoid}
 .step h4{margin:0 0 6px;font-size:14px} .step p{margin:2px 0;font-size:13px}
 .pass{color:#16794c} .noev{color:#b45309;font-size:12px}
 .sev{font-size:11px;border-radius:999px;padding:1px 8px;margin-left:6px;border:1px solid}
 .sev.blocker{color:#b91c1c;border-color:#fca5a5} .sev.major{color:#b45309;border-color:#fcd34d} .sev.advisory{color:#555;border-color:#ccc}
 .media{display:flex;flex-wrap:wrap;gap:10px;margin-top:8px}
 figure{margin:0;width:220px} img{width:100%;border:1px solid #ddd;border-radius:6px}
 figcaption{font-size:11px;color:#666;word-break:break-all}
 .rules{background:#fff7ed;border:1px solid #fdba74;border-radius:8px;padding:10px 18px;font-size:12px}
 footer{margin-top:32px;font-size:12px;color:#555;border-top:1px solid #ddd;padding-top:12px}
</style></head><body>
<h1>FarmEye Controller v8 — সুরক্ষা টেস্ট রিপোর্ট</h1>
<p class="meta">আর্থিং / ফিউজ / MOV / কনফরমাল কোটিং — প্রমাণসহ<br/>
তৈরির তারিখ: ${new Date().toLocaleString('bn-BD')}${boardSerial ? ` | বোর্ড সিরিয়াল: ${esc(boardSerial)}` : ''}</p>
<div class="summary">
 <div class="card">মোট ধাপ: <b>${allSteps.length}</b></div>
 <div class="card">সম্পন্ন: <b>${done}</b></div>
 <div class="card">প্রমাণ আছে: <b>${withEvidence}</b> ধাপে</div>
 <div class="card">মোট ফাইল: <b>${evidence.length}</b></div>
</div>
<div class="rules"><b>নিরাপত্তা নিয়ম</b><ul>${TEST_PLAN_SAFETY_RULES.map((r) => `<li>${esc(r)}</li>`).join('')}</ul></div>
${sections}
<footer>স্বাক্ষর: ________________ &nbsp; তারিখ: __________ &nbsp; | &nbsp; Nexiot Labs © 2026</footer>
</body></html>`;
}

export function downloadEvidenceReport(input: ReportInput) {
  const html = buildEvidenceReportHtml(input);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `farmeye_v8_test_report_${new Date().toISOString().slice(0, 10)}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
