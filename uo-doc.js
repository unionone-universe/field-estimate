/* =========================================================================
   UNION ONE 견적서 서식 공용 모듈
   파일명: uo-doc.js

   이 파일 하나가 견적서의 생김새를 책임집니다.
   - index.html (우리 태블릿)  → uo-estimate-v2.js 가 불러 씁니다.
   - sign.html  (고객 폰 서명) → 직접 불러 씁니다.

   서식을 고칠 일이 있으면 이 파일만 고치면 양쪽이 같이 바뀝니다.
   ========================================================================= */

(function () {
  "use strict";

  /* ---------------------------------------------------------------
     공급자 정보
     상호나 주소가 바뀌면 여기만 고치면 됩니다.
     --------------------------------------------------------------- */
  const SUPPLIER = {
    bizNo: "210-88-03747",
    company: "(주)유니온원철거",
    ceo: "김정훈",
    address: "대구광역시 동구 동화천로77길 46, 3층",
    bizType: "건설업",
    bizItem: "철거 및 리모델링",
    tel: "010-8980-8188",
    tel2: "1551-8757",
    fax: "053-323-8868",
    email: "unionone@unionone8868.com",
    /* ★ 계좌는 예금주 변경 중이라 아직 비어 있습니다 (2026-09-23).
       비어 있는 동안에는 견적서·PDF 에서 계좌 줄 자체를 그리지 않습니다.
       새 계좌를 받으면 아래 한 줄만 채우면 그때부터 다시 찍힙니다. */
    bank: ""
  };

  const VAT_RATE = 0.1;

  const TERMS = [
    "공사 착수 전 총 계약금액의 50%를 계약금으로 선입금하며, 입금 확인 후 공사를 진행합니다.",
    "공사 범위 외 추가 작업 및 현장 여건 변경 사항은 별도 협의 후 반영합니다.",
    "폐기물 발생량, 반출 조건 및 현장 상황에 따라 추가 비용이 발생할 수 있습니다."
  ];

  const PAPER_W = 794;
  const PAPER_H = 1123;
  /* 처음 밀도를 고르는 어림 무게(묶음 줄 1 · 세부 줄 0.8 · 긴 이름 · 주소는 넘친 줄만큼) 의 경계.
     794 × 1123 종이에 실제로 넣어 잰 값(2026-10-01): 기본 ~21 · dense-1 ~24 · dense-2 ~31.
     세부 줄이 있으면 31 을 넘을 때 이어 쓴 판으로(그 판은 세부 줄 100개도 들어간다).
     ★ 줄이는 것은 dense-3 · 이어 쓰기까지 — 그래도 넘치면 **여러 쪽**(nc2-multi)으로 나눈다 (2026-10-02 · 19 지시
       '긴 문서를 억지로 한 장에 줄여 읽을 수 없게 하지 않는다'). 예전의 tight(표 9px) · tight-2(8.5px)는 없앴다 */
  const DOC_FIT = { dense1: 20, dense2: 24, dense3: 31 };
  /* 둘째 쪽부터 위 여백 · 모든 쪽 아래 여백 (쪽 번호 자리) */
  const PAGE_TOP = 40;
  const PAGE_BOTTOM = 34;

  const LOGO_FILE = "./uo-logo.png";
  const MARK_FILE = "./uo-watermark.png";
  /* ★ 법인 인감 이미지는 아직 없습니다 (2026-09-23).
     이 이름으로 파일을 폴더에 넣어 두기만 하면 그때부터 그 도장이 찍히고,
     없는 동안에는 아래 임시 도장이 대신 찍힙니다. */
  const STAMP_FILE = "./uo-stamp.png";

  /* 도장 파일이 없을 때 임시로 쓰는 대체 도장 */
  const FALLBACK_STAMP =
    "data:image/svg+xml;charset=utf-8," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">' +
      '<circle cx="100" cy="100" r="92" fill="none" stroke="#C8102E" stroke-width="9"/>' +
      '<circle cx="100" cy="100" r="78" fill="none" stroke="#C8102E" stroke-width="3"/>' +
      '<text x="100" y="92" text-anchor="middle" fill="#C8102E" font-size="23" font-weight="900" font-family="sans-serif">유니온원철거</text>' +
      '<text x="100" y="126" text-anchor="middle" fill="#C8102E" font-size="20" font-weight="900" font-family="sans-serif">주식회사</text>' +
      "</svg>"
    );

  let stampSrc = FALLBACK_STAMP;

  /* ---------------------------------------------------------------
     유틸
     --------------------------------------------------------------- */
  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function num(n) {
    return (Math.round(Number(n) || 0)).toLocaleString("ko-KR");
  }

  function todayText(date) {
    const d = date ? new Date(date) : new Date();
    if (isNaN(d.getTime())) return "";
    return d.getFullYear() + "년 " +
      String(d.getMonth() + 1).padStart(2, "0") + "월 " +
      String(d.getDate()).padStart(2, "0") + "일";
  }

  function nowStamp() {
    const d = new Date();
    return d.getFullYear() + "-" +
      String(d.getMonth() + 1).padStart(2, "0") + "-" +
      String(d.getDate()).padStart(2, "0") + " " +
      String(d.getHours()).padStart(2, "0") + ":" +
      String(d.getMinutes()).padStart(2, "0");
  }

  function vatOf(supply) {
    return Math.round(((Number(supply) || 0) * VAT_RATE) / 10) * 10;
  }

  /* 도장 파일이 있으면 그걸 쓰고, 없으면 임시 도장으로 갑니다. */
  function loadStamp(onReady) {
    const img = new Image();
    img.onload = function () {
      stampSrc = STAMP_FILE;
      if (typeof onReady === "function") onReady(stampSrc);
    };
    img.onerror = function () {
      console.warn("uo-stamp.png 을 찾지 못해 임시 도장을 사용합니다.");
      if (typeof onReady === "function") onReady(stampSrc);
    };
    img.src = STAMP_FILE;
  }

  function getStampSrc() {
    return stampSrc;
  }

  /* ---------------------------------------------------------------
     내역표 구분 열 합치기
     같은 구분이 이어지면 첫 줄에만 구분명을 남깁니다.
     --------------------------------------------------------------- */
  function collapseGroups(rows) {
    let last = "";
    return (rows || []).map(function (row) {
      const copy = Object.assign({}, row);
      if (copy.sub) return copy;
      if (copy.group && copy.group === last) copy.groupText = "";
      else { copy.groupText = copy.group || ""; last = copy.group || last; }
      return copy;
    });
  }

  /* ---------------------------------------------------------------
     견적서 HTML 만들기

     data = {
       code, staffName, customerName, phone, address,
       workDays, dateText,
       rows: [{ group,name,spec,unit,qty,price,amount,note,sub }],
       supply, vat, total,
       sign: { dataUrl, signedAt },
       signable: true/false      // 발주자 칸을 누를 수 있는지
     }
     --------------------------------------------------------------- */
  function buildDoc(data, idAttr) {
    const d = data || {};
    const raw = collapseGroups(d.rows);

    // 원 견적에 이어 붙는 추가 공사면 제목과 표기를 바꿉니다.
    const isAddon = !!d.addonBase;
    const docTitle = isAddon ? "추가 견적서" : "견 적 서";

    /* ★ 세부 항목(└ 줄)이 2줄 이상 이어지면, 한 줄씩 쓴 판과 한 칸에 이어 쓴 판(.nc2-subjoin)을 둘 다 넣어 둔다.
         평소엔 한 줄씩 — 한 장에 안 들어갈 때만 종이에 nc2-joined 를 붙여 이어 쓴 판으로 바꾼다(fitPaper).
         항목은 하나도 빼지 않는다 (2.0 · 검수 1차: 37줄 · 긴 고객명에서 서명 · 연락처가 잘렸다) */
    const runs = [];                       // 이어지는 세부 줄 묶음 [{ at, items }]
    raw.forEach(function (row, i) {
      if (!row.sub) return;
      const last = runs[runs.length - 1];
      if (last && last.at + last.items.length === i) last.items.push(row);
      else runs.push({ at: i, items: [row] });
    });
    const runOf = {};
    let runNo = 0;
    runs.forEach(function (run) {
      if (run.items.length < 2) return;
      run.no = runNo++;
      run.items.forEach(function (row, k) { runOf[run.at + k] = { run: run, first: k === 0 }; });
    });

    /* 한 줄씩 쓴 판의 높이를 어림해 처음 밀도를 고른다(긴 고객명 · 주소는 줄 수만큼 더한다).
       아주 길면 처음부터 이어 쓴 판. 어림이 빗나가도 화면 · PDF 에 놓은 뒤 fitPaper 가 실제 높이를 재서 한 단계씩 더 줄인다 */
    const nameLines = Math.max(1, Math.ceil(String(d.customerName || "").length / 20));
    const addrLines = Math.max(1, Math.ceil(String(d.address || "").length / 30));
    const extra = (nameLines - 1) * 1.5 + (addrLines - 1);
    const sepWeight = raw.reduce(function (w, row) { return w + (row.sub ? 0.8 : 1); }, 0) + extra;
    /* 단계는 fitPaper 와 같은 차례로 쌓는다(dense-1 → 2 → 3 → 이어 쓰기).
       화면 · PDF 에서는 fitPaper 가 실제 높이로 한 번 더 확인하고, 그래도 넘치면 여러 쪽으로 */
    const hasRuns = runs.some(function (run) { return run.items.length > 1; });
    let lvl = 0;
    if (sepWeight > DOC_FIT.dense1) lvl = 1;
    if (sepWeight > DOC_FIT.dense2) lvl = 2;
    if (sepWeight > DOC_FIT.dense3) lvl = hasRuns ? 4 : 3;
    const density = DENSITY_STEPS.slice(0, lvl).filter(function (c) { return hasRuns || c !== "nc2-joined"; })
      .map(function (c) { return " " + c; }).join("");

    const supply = Number(d.supply) || 0;
    const vat = (d.vat != null) ? Number(d.vat) : vatOf(supply);
    const total = (d.total != null) ? Number(d.total) : (supply + vat);

    const sign = d.sign || {};

    const bodyRows = raw.map(function (row, i) {
      const r = runOf[i];
      if (row.sub) {
        /* 이어 쓴 판(품명부터 비고까지 한 칸)은 그 묶음 첫 줄 앞에 한 번 — nc2-joined 일 때만 보인다 */
        const joined = (r && r.first)
          ? '<tr class="nc2-sub nc2-subjoin" data-run="' + r.run.no + '">' +
              "<td></td>" +
              '<td class="nc2-l nc2-subname" colspan="7">└ ' +
                esc(r.run.items.map(function (it) { return it.name; }).join(" · ")) + "</td>" +
            "</tr>"
          : "";
        return joined + '<tr class="nc2-sub' + (r ? ' nc2-sep" data-run="' + r.run.no : "") + '">' +
          "<td></td>" +
          '<td class="nc2-l nc2-subname">└ ' + esc(row.name) + "</td>" +
          '<td colspan="6"></td>' +
          "</tr>";
      }
      return "<tr>" +
        '<td class="nc2-c nc2-grp">' + esc(row.groupText || "") + "</td>" +
        '<td class="nc2-l">' + esc(row.name) + "</td>" +
        '<td class="nc2-c nc2-spec">' + esc(row.spec || "") + "</td>" +
        '<td class="nc2-c">' + esc(row.unit || "") + "</td>" +
        '<td class="nc2-c">' + esc(row.qty === "" || row.qty == null ? "" : row.qty) + "</td>" +
        '<td class="nc2-r">' + (row.price === "" || row.price == null ? "" : num(row.price)) + "</td>" +
        '<td class="nc2-r nc2-amt">' + (row.amount === "" || row.amount == null ? "" : num(row.amount)) + "</td>" +
        '<td class="nc2-c nc2-note">' + esc(row.note || "") + "</td>" +
        "</tr>";
    }).join("");

    const customerBox = sign.dataUrl
      ? '<img class="nc2-sign-img" src="' + sign.dataUrl + '" alt="발주자 서명" />'
      : '<span class="nc2-sign-empty">(인)</span>';

    const touchClass = (!sign.dataUrl && d.signable) ? " nc2-sign-touch" : "";
    const touchAttr = (!sign.dataUrl && d.signable) ? ' data-nc2-sign="customer"' : "";

    const signFoot = sign.signedAt
      ? '<div class="nc2-sign-at">' + esc(sign.signedAt) + "</div>"
      : (d.signable
          ? '<div class="nc2-sign-at nc2-sign-hint">터치하여 서명</div>'
          : '<div class="nc2-sign-at">&nbsp;</div>');

    /* ★★ 2.0 서식 (2026-10-01) — 읽는 차례대로: 회사 → 현장 → 작업 범위 → 기간 → 금액 → 조건 → 서명.
         담긴 값 · 특약 문구 · 금액 계산 · 서명 칸(data-nc2-sign)은 예전 그대로이고 놓는 자리와 위계만 바꿨다.
         화면 · PDF · 사진이 모두 이 한 장을 쓴다(794 × 1123). */
    return '' +
      '<section ' + (idAttr || "") + ' class="nc2-paper' + density + '">' +
        '<img class="nc2-watermark" src="' + MARK_FILE + '" alt="" aria-hidden="true" />' +

        /* 머리 — 회사 표 · 문서 제목 · 번호/날짜 */
        '<header class="nc2-head">' +
          '<div class="nc2-brand">' +
            '<img class="nc2-logo" src="' + LOGO_FILE + '" alt="UNION ONE" />' +
            '<div class="nc2-brand-sub">' + esc(SUPPLIER.company) + " · " + esc(SUPPLIER.bizItem) + "</div>" +
          "</div>" +
          '<div class="nc2-titlebox">' +
            '<h1 class="nc2-title' + (isAddon ? " nc2-title-addon" : "") + '">' + docTitle + "</h1>" +
            '<div class="nc2-docmeta">' +
              "<span>견적번호</span><strong>" + esc(d.code || "-") + "</strong>" +
              "<span>견적일자</span><strong>" + esc(d.dateText || todayText()) + "</strong>" +
            "</div>" +
          "</div>" +
        "</header>" +

        /* ① 회사(공급자) · ② 현장(받는 분) — 나란히 (왼쪽부터 읽는다) */
        '<div class="nc2-band">' +
        '<section class="nc2-sec nc2-from">' +
          '<h2 class="nc2-h"><b>1</b>공급자</h2>' +
          '<div class="nc2-kv nc2-kv-4">' +
            "<span>상호</span><strong>" + esc(SUPPLIER.company) + "</strong>" +
            "<span>대표자</span><strong>" + esc(SUPPLIER.ceo) + "</strong>" +
            '<span>등록번호</span><strong class="nc2-wide">' + esc(SUPPLIER.bizNo) + "</strong>" +
            '<span>업태 · 종목</span><strong class="nc2-wide">' + esc(SUPPLIER.bizType) + " · " + esc(SUPPLIER.bizItem) + "</strong>" +
            '<span>소재지</span><strong class="nc2-wide">' + esc(SUPPLIER.address) + "</strong>" +
            "<span>전화</span><strong>" + esc(SUPPLIER.tel) + "</strong>" +
            "<span>FAX</span><strong>" + esc(SUPPLIER.fax) + "</strong>" +
          "</div>" +
        "</section>" +

        /* ② 현장(받는 분) */
        '<section class="nc2-sec nc2-to">' +
          '<h2 class="nc2-h"><b>2</b>현장 · 받는 분</h2>' +
          '<div class="nc2-client-name"><strong>' + esc(d.customerName || "-") + "</strong><span>귀하</span></div>" +
          '<div class="nc2-kv nc2-kv-4">' +
            '<span>현장주소</span><strong class="nc2-wide nc2-addr">' + esc(d.address || "-") + "</strong>" +
            '<span>연락처</span><strong class="nc2-wide">' + esc(d.phone || "-") + "</strong>" +
            (isAddon
              ? '<span>원 견적</span><strong class="nc2-wide">' + esc(d.addonBase) + "</strong>"
              : '<span>담당자</span><strong class="nc2-wide">' + esc(d.staffName || "-") + "</strong>") +
          "</div>" +
        "</section>" +
        "</div>" +

        /* ③ 작업 범위 */
        '<section class="nc2-sec nc2-scope">' +
          '<h2 class="nc2-h"><b>3</b>작업 범위 · 내역</h2>' +
          '<table class="nc2-table">' +
            "<colgroup>" +
              '<col style="width:68px" /><col /><col style="width:96px" />' +
              '<col style="width:40px" /><col style="width:44px" />' +
              '<col style="width:90px" /><col style="width:102px" /><col style="width:62px" />' +
            "</colgroup>" +
            "<thead><tr>" +
              "<th>구분</th><th>품명</th><th>규격</th><th>단위</th>" +
              "<th>수량</th><th>단가</th><th>금액</th><th>비고</th>" +
            "</tr></thead>" +
            "<tbody>" + (bodyRows || '<tr><td colspan="8" class="nc2-c">선택된 작업 범위가 없습니다.</td></tr>') + "</tbody>" +
          "</table>" +
        "</section>" +

        /* ④ 기간 · ⑤ 금액 — 아래로 모은다 */
        '<div class="nc2-bottomgrp">' +
          '<div class="nc2-money-row">' +
            '<section class="nc2-sec nc2-period">' +
              '<h2 class="nc2-h"><b>4</b>공사기간</h2>' +
              '<div class="nc2-period-v"><strong>' + esc(String(Number(d.workDays) || 1)) + "</strong><span>일</span></div>" +
            "</section>" +
            '<section class="nc2-sec nc2-total">' +
              '<h2 class="nc2-h"><b>5</b>견적 금액</h2>' +
              '<div class="nc2-total-row"><span>공급가액</span><strong>' + num(supply) + "</strong></div>" +
              '<div class="nc2-total-row"><span>부가세(10%)</span><strong>' + num(vat) + "</strong></div>" +
              '<div class="nc2-total-row nc2-total-grand"><span>합계 (부가세 포함)</span><strong>' + num(total) + "<em>원</em></strong></div>" +
            "</section>" +
          "</div>" +

          /* 추가공사 안내 */
          (isAddon
            ? '<div class="nc2-addon-note">본 견적서는 ' + esc(d.addonBase) +
              ' 현장의 <strong>추가 공사</strong>에 대한 별도 견적입니다. 기존 계약 금액에 합산됩니다.</div>'
            : "") +

          /* ⑥ 조건 · ⑦ 서명 — 나란히 */
          '<div class="nc2-end-row">' +
          '<section class="nc2-sec nc2-terms">' +
            '<h2 class="nc2-h"><b>6</b>특약사항</h2>' +
            "<ol>" + TERMS.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + "</ol>" +
            /* 계좌가 비어 있으면 줄 자체를 그리지 않습니다 ('계좌: -' 가 찍히면 안 됩니다) */
            (SUPPLIER.bank
              ? '<div class="nc2-bank">계좌번호: ' + esc(SUPPLIER.bank) + "</div>"
              : "") +
          "</section>" +

          /* ⑦ 서명 */
          '<section class="nc2-sec nc2-signsec">' +
            '<h2 class="nc2-h"><b>7</b>서명</h2>' +
            '<div class="nc2-signs">' +
              '<div class="nc2-sign-cell">' +
                '<div class="nc2-sign-label">시공사</div>' +
                '<div class="nc2-sign-box"><img class="nc2-stamp" src="' + stampSrc + '" alt="시공사 직인" /></div>' +
                '<div class="nc2-sign-at">' + esc(SUPPLIER.company) + "</div>" +
              "</div>" +
              '<div class="nc2-sign-cell">' +
                '<div class="nc2-sign-label">발주자</div>' +
                '<div class="nc2-sign-box' + touchClass + '"' + touchAttr + ">" + customerBox + "</div>" +
                signFoot +
              "</div>" +
            "</div>" +
          "</section>" +
          "</div>" +

          /* 푸터 */
          '<div class="nc2-bottom">' +
            '<div class="nc2-contact">' +
              "<span>" + esc(SUPPLIER.tel2) + "</span>" +
              "<span>" + esc(SUPPLIER.fax) + "</span>" +
              "<span>" + esc(SUPPLIER.email) + "</span>" +
            "</div>" +
          "</div>" +
        "</div>" +
        '<div class="nc2-rule"></div>' +
      "</section>";
  }

  /* ---------------------------------------------------------------
     화면 폭에 맞춰 A4 원본을 통째로 축소합니다.
     보이는 화면과 저장되는 PDF가 어긋나지 않게 하려는 목적입니다.
     --------------------------------------------------------------- */
  /* ---------------------------------------------------------------
     한 장에 맞추기 — 화면 · PDF 에 놓은 종이의 실제 높이를 재서, 넘치면 밀도를 한 단계씩 더 올린다 (2.0 · 검수 1차).
     buildDoc 의 어림(줄 수 · 이름 · 주소 길이)이 빗나가도 서명 · 연락처가 잘리지 않게 하는 안전장치
     --------------------------------------------------------------- */
  const DENSITY_STEPS = ["nc2-dense-1", "nc2-dense-2", "nc2-dense-3", "nc2-joined"];
  function fitPaper(paper) {
    if (!paper || !paper.classList) return;
    const over = function () { return paper.scrollHeight > PAPER_H + 1; };
    const joins = Array.prototype.slice.call(paper.querySelectorAll("tr.nc2-subjoin[data-run]"));
    const seps = function (row) { return paper.querySelectorAll('tr.nc2-sep[data-run="' + row.getAttribute("data-run") + '"]'); };
    const setJoin = function (row, on) {
      row.classList.toggle("nc2-on", on);
      Array.prototype.forEach.call(seps(row), function (r) { r.classList.toggle("nc2-off", on); });
    };

    /* 세부 줄 이어 쓰기는 묶음마다 — 어림으로 통째 이어 쓴 판이면, 작은 묶음부터 한 줄씩으로 되돌려 보고
       들어가는 만큼만 남긴다(읽기 쉬운 쪽). 안 들어가면 그 묶음은 이어 쓴 채로 */
    if (paper.classList.contains("nc2-joined") && joins.length) {
      paper.classList.remove("nc2-joined");
      joins.forEach(function (row) { setJoin(row, true); });
      joins.slice().sort(function (a, b) { return seps(a).length - seps(b).length; }).some(function (row) {
        setJoin(row, false);
        if (!over()) return false;
        setJoin(row, true);
        return true;                       // 이보다 큰 묶음도 안 들어간다
      });
    }

    let i = -1;
    DENSITY_STEPS.forEach(function (c, k) { if (paper.classList.contains(c)) i = k; });
    while (over() && i < DENSITY_STEPS.length - 1) {
      i += 1;
      if (DENSITY_STEPS[i] === "nc2-joined" && joins.length) {
        // 큰 묶음부터 하나씩 이어 쓴다 — 들어가면 멈춘다
        joins.filter(function (row) { return !row.classList.contains("nc2-on"); })
          .sort(function (a, b) { return seps(b).length - seps(a).length; })
          .some(function (row) { setJoin(row, true); return !over(); });
      } else {
        paper.classList.add(DENSITY_STEPS[i]);
      }
    }
    /* ★ 읽을 수 있는 크기(dense-3 · 이어 쓰기)까지 줄여도 넘치면 종이를 늘리고 PDF 에서 쪽을 나눈다 (pageSlices) */
    if (over()) paper.classList.add("nc2-multi");
  }

  /**
   * 여러 쪽 견적서를 A4 쪽으로 자를 자리 (CSS px · 종이 위에서부터).
   * ★ 표의 줄 · 묶음(현장 · 표 · 금액 · 조건 · 서명) 사이에서만 자른다 — 글자 한 줄이 두 쪽에 걸치지 않게.
   * ★ 둘째 쪽부터는 표 머리(구분 · 품명 · …)를 다시 그린다 (canvasToPdf).
   * 한 장이면 { slices:[[0, PAPER_H]] } — 예전과 똑같이 한 장으로 만든다.
   */
  function pageSlices(paper) {
    const H = paper ? Math.ceil(paper.scrollHeight) : PAPER_H;
    if (!paper || !paper.classList.contains("nc2-multi") || H <= PAPER_H + 1) return { slices: [[0, PAPER_H]] };
    const top = paper.getBoundingClientRect().top;
    const rel = function (el) { const r = el.getBoundingClientRect(); return [Math.round(r.top - top), Math.round(r.bottom - top)]; };
    const thead = paper.querySelector(".nc2-table thead"), table = paper.querySelector(".nc2-table");
    const head = thead ? rel(thead) : null, tbl = table ? rel(table) : null;
    const headH = head ? head[1] - head[0] : 0;
    const cuts = [];
    Array.prototype.forEach.call(paper.querySelectorAll(
      ".nc2-table tbody tr, .nc2-sec, .nc2-band, .nc2-bottomgrp, .nc2-money-row, .nc2-end-row, .nc2-bottom"), function (el) {
      if (!el.getClientRects().length) return;
      /* 표의 줄은 줄 경계 그대로, 묶음은 몇 px 위에서 — 번호 딱지 윗변이 앞 쪽 끝에 걸리지 않게 */
      cuts.push(rel(el)[0] - (el.tagName === "TR" ? 0 : 8));
    });
    cuts.sort(function (a, b) { return a - b; });
    const slices = [];
    let start = 0;
    while (start < H && slices.length < 20) {
      const room = PAPER_H - PAGE_BOTTOM - (slices.length ? PAGE_TOP + headH : 0);
      if (H - start <= room) { slices.push([start, H]); break; }
      const limit = start + room;
      let cut = 0;
      cuts.forEach(function (c) { if (c > start + 60 && c <= limit) cut = c; });
      if (!cut) cut = limit;                 // 자를 자리가 없는 아주 긴 칸 — 그 자리에서 자른다
      slices.push([start, cut]);
      start = cut;
    }
    return { slices: slices, head: head, table: tbl };
  }

  /**
   * 그려 둔 견적서(canvas · canvas.uoPages)를 A4 PDF 로.
   * 한 장이면 예전 그대로 한 쪽 · 여러 쪽이면 자른 자리대로 쪽을 만들고 아래에 '1 / 2 쪽' 을 적는다.
   */
  function canvasToPdf(canvas) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      throw new Error("PDF 라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.");
    }
    const jsPDF = window.jspdf.jsPDF;
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
    const pg = canvas.uoPages;
    if (!pg || !pg.slices || pg.slices.length <= 1) {
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.94), "JPEG", 0, 0, 210, 297, undefined, "FAST");
      return pdf;
    }
    const s = canvas.width / PAPER_W, W = canvas.width, H = Math.round(PAPER_H * s);
    pg.slices.forEach(function (sl, i) {
      if (i) pdf.addPage();
      const c = document.createElement("canvas");
      c.width = W; c.height = H;
      const g = c.getContext("2d");
      g.fillStyle = "#FFFFFF"; g.fillRect(0, 0, W, H);
      let y = 0;
      if (i) {
        y = PAGE_TOP;
        if (pg.head && pg.table && sl[0] > pg.table[0] && sl[0] < pg.table[1]) {
          const hh = pg.head[1] - pg.head[0];
          g.drawImage(canvas, 0, pg.head[0] * s, W, hh * s, 0, y * s, W, hh * s);
          y += hh;
        }
      }
      const h = sl[1] - sl[0];
      g.drawImage(canvas, 0, sl[0] * s, W, h * s, 0, y * s, W, h * s);
      g.fillStyle = "#5F6772";
      g.font = "600 " + Math.round(11 * s) + "px sans-serif";
      g.textAlign = "right";
      g.fillText((i + 1) + " / " + pg.slices.length + " 쪽", W - 40 * s, H - 14 * s);
      pdf.addImage(c.toDataURL("image/jpeg", 0.94), "JPEG", 0, 0, 210, 297, undefined, "FAST");
    });
    return pdf;
  }

  function fitScreenDoc(hostEl, maxHeightEl) {
    const host = hostEl || document.querySelector(".nc2-screen-host");
    if (!host) return;
    const wrap = host.querySelector(".nc2-screen-wrap");
    if (!wrap) return;
    const paper = wrap.querySelector(".nc2-paper");
    fitPaper(paper);
    /* 여러 쪽 견적서는 종이 높이만큼 — 폭에 맞춰 줄이고 아래로 넘겨 본다 */
    const multi = !!(paper && paper.classList.contains("nc2-multi"));
    const PH = multi ? Math.ceil(paper.scrollHeight) : PAPER_H;
    wrap.style.height = PH + "px";

    const availW = host.clientWidth || PAPER_W;
    const panel = maxHeightEl || host.closest(".estimate-doc");
    /* ★★ 판 높이는 견적서를 원래 크기로 편 채로 잽니다 (2026-09-15 · '견적서가 작게 나온다').
       세로 화면에서는 판 높이가 **지난번에 줄여 둔 견적서 높이**를 따라갑니다.
       그걸 그대로 재면 한 번 작아진 견적서가 다시는 커지지 않았습니다
       (가로로 들었다 세로로 돌리면 절반 크기에 머물렀습니다).
       화면 높이에 맞춰 둔 가로 큰 화면에서는 판이 원래 화면 높이로 재어져 전과 같습니다. */
    host.style.height = PAPER_H + "px";
    const availH = panel ? panel.clientHeight - 32 : 0;

    let k = availW / PAPER_W;
    if (availH > 240 && !multi) k = Math.min(k, availH / PAPER_H);
    k = Math.max(0.22, Math.min(k, 1.15));

    wrap.style.transform = "scale(" + k + ")";
    host.style.height = Math.round(PH * k) + "px";
  }

  function screenShell(html) {
    return '<div class="nc2-screen-host"><div class="nc2-screen-wrap">' + html + "</div></div>";
  }

  /* ---------------------------------------------------------------
     서명 패드
     --------------------------------------------------------------- */
  let signCanvas = null;
  let signCtx = null;
  let drawing = false;
  let hasInk = false;
  let onApply = null;

  function buildSignModal() {
    if (document.getElementById("nc2SignModal")) return;

    const modal = document.createElement("div");
    modal.id = "nc2SignModal";
    modal.className = "nc2-modal";
    modal.innerHTML =
      '<div class="nc2-modal-card">' +
        '<div class="nc2-modal-title">발주자 서명</div>' +
        '<div class="nc2-modal-text">아래 칸에 서명해 주세요. 서명하면 견적서에 바로 반영됩니다.</div>' +
        '<div class="nc2-pad-wrap">' +
          '<canvas id="nc2SignCanvas"></canvas>' +
          '<div class="nc2-pad-guide" id="nc2PadGuide">여기에 서명</div>' +
        "</div>" +
        '<div class="nc2-sign-actions">' +
          '<button type="button" class="nc2-btn ghost" id="nc2SignClear">다시 쓰기</button>' +
          '<button type="button" class="nc2-btn ghost" id="nc2SignCancel">취소</button>' +
          '<button type="button" class="nc2-btn" id="nc2SignApply">서명 완료</button>' +
        "</div>" +
      "</div>";

    document.body.appendChild(modal);

    signCanvas = document.getElementById("nc2SignCanvas");
    signCtx = signCanvas.getContext("2d");

    signCanvas.addEventListener("pointerdown", function (e) {
      e.preventDefault();
      signCanvas.setPointerCapture(e.pointerId);
      drawing = true;
      hasInk = true;
      document.getElementById("nc2PadGuide").style.display = "none";
      const p = padPoint(e);
      signCtx.beginPath();
      signCtx.moveTo(p.x, p.y);
    });

    signCanvas.addEventListener("pointermove", function (e) {
      if (!drawing) return;
      e.preventDefault();
      const p = padPoint(e);
      signCtx.lineTo(p.x, p.y);
      signCtx.stroke();
    });

    ["pointerup", "pointercancel", "pointerleave"].forEach(function (ev) {
      signCanvas.addEventListener(ev, function () { drawing = false; });
    });

    document.getElementById("nc2SignClear").addEventListener("click", clearPad);
    document.getElementById("nc2SignCancel").addEventListener("click", closeSignPad);
    document.getElementById("nc2SignApply").addEventListener("click", applyPad);
    modal.addEventListener("click", function (e) { if (e.target === modal) closeSignPad(); });
  }

  function padPoint(e) {
    const r = signCanvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function resizePad() {
    const rect = signCanvas.getBoundingClientRect();
    const dpr = Math.max(window.devicePixelRatio || 1, 2);
    signCanvas.width = Math.round(rect.width * dpr);
    signCanvas.height = Math.round(rect.height * dpr);
    signCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    signCtx.lineCap = "round";
    signCtx.lineJoin = "round";
    signCtx.strokeStyle = "#111";
    signCtx.lineWidth = 3;
  }

  function clearPad() {
    const rect = signCanvas.getBoundingClientRect();
    signCtx.clearRect(0, 0, rect.width, rect.height);
    hasInk = false;
    document.getElementById("nc2PadGuide").style.display = "block";
  }

  function openSignPad(callback) {
    buildSignModal();
    onApply = callback;
    document.getElementById("nc2SignModal").classList.add("show");
    setTimeout(function () { resizePad(); clearPad(); }, 60);
  }

  function closeSignPad() {
    const modal = document.getElementById("nc2SignModal");
    if (modal) modal.classList.remove("show");
    drawing = false;
  }

  /* 서명 이미지가 시트 칸 하나에 들어갈 수 있는 크기.
     구글 시트는 칸 하나에 50,000자까지만 받습니다.
     ★ 서명판은 화면 해상도의 2~3배로 크게 그립니다(선이 매끄럽게 보이려고).
       예전에는 그 큰 그림을 줄이지 않고 그대로 보냈습니다. 선이 조금 많은
       서명이면 한도를 넘겨서, **고객이 서명을 마친 마지막 순간에 실패**했습니다.
       그때는 이미 서명본 PDF 와 '서명완료' 표시가 저장된 뒤라,
       고객 화면에만 실패라고 뜨는 가장 나쁜 모양이었습니다.
     서명은 선 몇 개라 가로 600px 이면 충분합니다. 견적서 PDF 도 같이 가벼워집니다. */
  const SIGN_MAX_WIDTH = 600;

  /* 서명 이미지의 빈 여백을 잘라 서명칸에 꽉 차게 넣습니다. */
  function trimSignature(source) {
    const w = source.width;
    const h = source.height;
    const data = source.getContext("2d").getImageData(0, 0, w, h).data;

    let minX = w, minY = h, maxX = 0, maxY = 0, found = false;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (data[(y * w + x) * 4 + 3] > 12) {
          found = true;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (!found) return source.toDataURL("image/png");

    const pad = 10;
    minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
    maxX = Math.min(w - 1, maxX + pad); maxY = Math.min(h - 1, maxY + pad);

    const cropW = maxX - minX + 1;
    const cropH = maxY - minY + 1;

    /* 너무 크면 줄여서 담습니다 (비율은 그대로). */
    const scale = Math.min(1, SIGN_MAX_WIDTH / cropW);
    const out = document.createElement("canvas");
    out.width = Math.max(1, Math.round(cropW * scale));
    out.height = Math.max(1, Math.round(cropH * scale));

    const ctx = out.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(source, minX, minY, cropW, cropH, 0, 0, out.width, out.height);
    return out.toDataURL("image/png");
  }

  function applyPad() {
    if (!hasInk) { alert("서명을 먼저 작성해 주세요."); return; }
    const result = { dataUrl: trimSignature(signCanvas), signedAt: nowStamp() };
    closeSignPad();
    if (typeof onApply === "function") onApply(result);
  }

  /* ---------------------------------------------------------------
     A4 원본을 그대로 캡처해 PDF 로 만듭니다.
     --------------------------------------------------------------- */
  async function renderCanvas(html) {
    if (!window.html2canvas) {
      throw new Error("이미지 생성 라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.");
    }

    let host = document.getElementById("nc2RenderHost");
    if (!host) {
      host = document.createElement("div");
      host.id = "nc2RenderHost";
      document.body.appendChild(host);
    }

    host.innerHTML = html;
    const paper = host.querySelector(".nc2-paper");

    await Promise.all(Array.from(paper.querySelectorAll("img")).map(function (img) {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise(function (resolve) { img.onload = resolve; img.onerror = resolve; });
    }));
    await new Promise(function (r) { requestAnimationFrame(function () { requestAnimationFrame(r); }); });
    fitPaper(paper);                       // PDF · 사진도 화면과 같은 판 (넘치면 여러 쪽)

    const canvas = await html2canvas(paper, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#FFFFFF",
      logging: false
    });
    canvas.uoPages = pageSlices(paper);    // 자를 자리는 종이가 화면에 있을 때 잰다

    host.innerHTML = "";
    return canvas;
  }

  async function makePdfBlob(data) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      throw new Error("PDF 라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.");
    }

    const canvas = await renderCanvas(buildDoc(data, ""));
    return canvasToPdf(canvas).output("blob");
  }

  function blobToBase64(blob) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onload = function () {
        const result = String(reader.result || "");
        const comma = result.indexOf(",");
        resolve(comma >= 0 ? result.slice(comma + 1) : result);
      };
      reader.onerror = function () { reject(new Error("파일을 읽지 못했습니다.")); };
      reader.readAsDataURL(blob);
    });
  }

  /* ---------------------------------------------------------------
     스타일
     --------------------------------------------------------------- */
  const CSS = `
  .nc2-screen-host{width:100%;overflow:hidden;}
  .nc2-screen-wrap{width:${PAPER_W}px;height:${PAPER_H}px;transform-origin:top left;}

  #nc2RenderHost{position:fixed;left:-20000px;top:0;width:${PAPER_W}px;height:${PAPER_H}px;
    overflow:hidden;pointer-events:none;background:#fff;}

  .nc2-paper{position:relative;width:${PAPER_W}px;height:${PAPER_H}px;overflow:hidden;
    padding:34px 40px 24px;background:#fff;color:#16191D;box-sizing:border-box;
    display:flex;flex-direction:column;isolation:isolate;
    font-family:"UOPretendard","Pretendard",-apple-system,BlinkMacSystemFont,
      "Segoe UI","Noto Sans KR","Apple SD Gothic Neo",sans-serif;
    font-variant-numeric:tabular-nums;word-break:keep-all;}
  .nc2-paper *{box-sizing:border-box;}
  .nc2-watermark{position:absolute;left:50%;top:56%;width:420px;max-height:160px;
    transform:translate(-50%,-50%);object-fit:contain;opacity:.045;
    z-index:0;pointer-events:none;}
  .nc2-paper > *:not(.nc2-watermark){position:relative;z-index:1;}

  /* 머리 — 회사 표(왼쪽) · 문서 제목과 번호(오른쪽). 아래 남색 굵은 선 */
  .nc2-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;
    padding-bottom:12px;border-bottom:3px solid #1B2A3A;}
  .nc2-brand{display:flex;flex-direction:column;gap:6px;min-width:0;}
  .nc2-logo{width:auto;height:40px;max-width:260px;object-fit:contain;object-position:left center;display:block;}
  .nc2-brand-sub{font-size:11px;font-weight:700;color:#5F6772;letter-spacing:.02em;}
  .nc2-titlebox{display:flex;flex-direction:column;align-items:flex-end;gap:8px;}
  .nc2-title{margin:0;font-size:32px;font-weight:900;letter-spacing:12px;padding-left:12px;line-height:1;color:#1B2A3A;}
  .nc2-title-addon{font-size:28px;letter-spacing:6px;}
  .nc2-docmeta{display:grid;grid-template-columns:auto auto;gap:2px 10px;font-size:11px;align-items:baseline;}
  .nc2-docmeta span{color:#5F6772;font-weight:700;text-align:right;}
  .nc2-docmeta strong{font-weight:800;color:#16191D;}

  /* 구획 — 작은 번호 제목 + 내용 */
  .nc2-sec{margin-top:12px;}
  .nc2-band{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:18px;margin-top:12px;align-items:start;}
  .nc2-band > .nc2-sec{margin-top:0;}
  .nc2-h{display:flex;align-items:center;gap:7px;margin:0 0 7px;font-size:11.5px;font-weight:850;color:#1B2A3A;letter-spacing:.02em;}
  .nc2-h b{display:inline-flex;align-items:center;justify-content:center;width:17px;height:17px;border-radius:5px;
    background:#1B2A3A;color:#fff;font-size:10px;font-weight:800;}
  .nc2-kv{display:grid;border-top:1px solid #D9DCD6;font-size:11px;}
  .nc2-kv-4{grid-template-columns:62px minmax(0,1fr) 46px minmax(0,1fr);}
  .nc2-kv > span,.nc2-kv > strong{min-height:22px;display:flex;align-items:center;padding:2px 8px;border-bottom:1px solid #E6E8E3;}
  .nc2-kv > span{background:#F5F6F3;color:#5F6772;font-weight:750;}
  .nc2-kv > strong{font-weight:800;color:#16191D;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
  .nc2-kv > strong.nc2-wide{grid-column:span 3;white-space:normal;line-height:1.4;}

  .nc2-client-name{display:flex;align-items:baseline;gap:8px;margin:0 0 6px;padding:0 2px;}
  .nc2-client-name strong{font-size:17px;font-weight:900;letter-spacing:-.4px;line-height:1.3;}
  .nc2-client-name span{font-size:12px;font-weight:800;color:#5F6772;flex:0 0 auto;}

  /* 내역 표 */
  .nc2-table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:11.5px;}
  .nc2-table th{height:26px;background:#1B2A3A;color:#fff;font-weight:800;font-size:11px;
    border:1px solid #1B2A3A;letter-spacing:.3px;}
  .nc2-table td{height:22px;padding:0 7px;border:1px solid #E1E4DF;font-weight:700;
    overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
  .nc2-table tbody tr:nth-child(even) td{background:#FAFAF8;}
  .nc2-l{text-align:left;}
  .nc2-c{text-align:center;}
  .nc2-r{text-align:right;font-variant-numeric:tabular-nums;}
  .nc2-grp{background:#F1F2EE !important;font-weight:850;color:#2A3038;}
  .nc2-amt{font-weight:900;}
  .nc2-spec,.nc2-note{font-size:10.5px;color:#454C55;}
  .nc2-sub td{height:18px;background:#fff !important;border-top:0;border-bottom:0;}
  .nc2-subname{padding-left:16px !important;font-size:10.5px;font-weight:650;color:#5F6772;}

  /* 아래 묶음 — 기간 · 금액 · 조건 · 서명은 종이 아래쪽에 모은다 */
  .nc2-bottomgrp{margin-top:auto;padding-top:6px;}
  .nc2-money-row{display:grid;grid-template-columns:124px minmax(0,1fr);gap:18px;align-items:stretch;}
  .nc2-money-row > .nc2-sec,.nc2-end-row > .nc2-sec{margin-top:0;}
  .nc2-end-row{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:18px;align-items:start;margin-top:12px;}
  .nc2-period{display:flex;flex-direction:column;}
  .nc2-period-v{flex:1;display:flex;align-items:center;justify-content:center;gap:4px;
    border:1px solid #D9DCD6;border-radius:6px;background:#F5F6F3;}
  .nc2-period-v strong{font-size:26px;font-weight:900;color:#1B2A3A;}
  .nc2-period-v span{font-size:13px;font-weight:800;color:#5F6772;}
  .nc2-total{border:0;}
  .nc2-total-row{display:grid;grid-template-columns:150px minmax(0,1fr);align-items:center;min-height:26px;
    border-top:1px solid #E1E4DF;font-size:12px;}
  .nc2-total-row span{padding:0 10px;color:#5F6772;font-weight:750;}
  .nc2-total-row strong{display:flex;align-items:baseline;justify-content:flex-end;gap:3px;padding:0 12px;
    font-weight:850;font-variant-numeric:tabular-nums;}
  .nc2-total-grand{min-height:40px;border-top:2px solid #1B2A3A;background:#F3F5F7;}
  .nc2-total-grand span{color:#1B2A3A;font-weight:900;font-size:13px;}
  .nc2-total-grand strong{font-size:22px;font-weight:900;letter-spacing:-.5px;color:#1B2A3A;}
  .nc2-total-grand em{font-style:normal;font-size:13px;font-weight:800;}

  .nc2-addon-note{margin-top:12px;padding:8px 11px;border-radius:6px;
    background:#FCEEE4;border:1px solid rgba(210,96,31,.28);
    color:#5A3317;font-size:10.5px;font-weight:750;line-height:1.5;}

  .nc2-terms ol{margin:0;padding-left:16px;}
  .nc2-terms li{font-size:10px;font-weight:600;line-height:1.55;color:#454C55;}
  .nc2-bank{display:inline-block;margin-top:8px;padding:5px 11px;border:1.5px solid #1B2A3A;border-radius:4px;
    font-size:11px;font-weight:900;}

  .nc2-signs{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
  .nc2-sign-cell{display:flex;flex-direction:column;align-items:stretch;gap:3px;
    padding:6px 8px;border:1px solid #D9DCD6;border-radius:6px;}
  .nc2-sign-label{font-size:11px;font-weight:900;color:#1B2A3A;text-align:center;}
  .nc2-sign-box{width:100%;height:58px;border:1px dashed #C6CBC3;border-radius:4px;
    background:#fff;display:flex;align-items:center;justify-content:center;overflow:hidden;}
  .nc2-sign-touch{cursor:pointer;border:2px dashed #D2601F;background:#FCEEE4;
    animation:nc2Pulse 1.6s ease-in-out infinite;}
  @keyframes nc2Pulse{
    0%,100%{background:#FCEEE4;border-color:#D2601F;}
    50%{background:#F8DCC8;border-color:#A9480F;}
  }
  .nc2-sign-touch .nc2-sign-empty{color:#A9480F;}
  .nc2-sign-empty{font-size:14px;font-weight:850;color:#B4B8BD;}
  .nc2-sign-img{max-width:88%;max-height:84%;object-fit:contain;}
  .nc2-stamp{width:54px;height:54px;object-fit:contain;}
  .nc2-sign-at{margin-top:0;font-size:9.5px;font-weight:750;color:#5F6772;text-align:center;}
  .nc2-sign-hint{color:#A9480F;font-weight:850;}

  .nc2-bottom{margin-top:10px;display:flex;align-items:center;justify-content:flex-end;gap:14px;}
  .nc2-contact{display:flex;gap:14px;font-size:9.5px;font-weight:750;color:#5F6772;}
  .nc2-rule{position:absolute;left:0;right:0;bottom:0;height:8px;background:#1B2A3A;z-index:1;}
  .nc2-rule::after{content:"";position:absolute;left:0;top:-3px;width:120px;height:3px;background:#D2601F;}

  .nc2-dense-1 .nc2-table{font-size:10.5px;}
  .nc2-dense-1 .nc2-table td{height:18px;}
  .nc2-dense-1 .nc2-sub td{height:15px;}
  .nc2-dense-1 .nc2-sec,.nc2-dense-1 .nc2-band,.nc2-dense-1 .nc2-end-row{margin-top:9px;}
  .nc2-dense-1 .nc2-kv > span,.nc2-dense-1 .nc2-kv > strong{min-height:20px;}
  .nc2-dense-1 .nc2-sign-box{height:52px;}
  .nc2-dense-2 .nc2-table,.nc2-dense-3 .nc2-table{font-size:9.5px;}
  .nc2-dense-2 .nc2-table td{height:15px;padding:0 5px;}
  .nc2-dense-3 .nc2-table td{height:13.5px;padding:0 5px;}
  .nc2-dense-2 .nc2-table th,.nc2-dense-3 .nc2-table th{height:22px;}
  .nc2-dense-2 .nc2-sub td{height:13px;}
  .nc2-dense-3 .nc2-sub td{height:12px;}
  .nc2-subjoin td{height:auto !important;}
  /* 세부 줄 이어 쓰기 — 평소엔 한 줄씩(.nc2-sep), 한 장에 안 들어갈 때만(.nc2-joined) 한 칸 */
  .nc2-subjoin{display:none;}
  .nc2-joined .nc2-subjoin,.nc2-subjoin.nc2-on{display:table-row;}
  .nc2-joined .nc2-sep,.nc2-sep.nc2-off{display:none;}
  /* 그래도 넘칠 때 (fitPaper) — 더 줄이지 않고 종이를 늘린다. PDF 는 pageSlices 자리에서 쪽을 나눈다 */
  .nc2-paper.nc2-multi{height:auto;min-height:${PAPER_H}px;overflow:visible;}
  .nc2-subjoin .nc2-subname{white-space:normal;line-height:1.45;padding-top:2px !important;padding-bottom:2px !important;}
  .nc2-dense-2 .nc2-subname,.nc2-dense-3 .nc2-subname{font-size:9px;}
  .nc2-dense-2 .nc2-spec,.nc2-dense-2 .nc2-note,.nc2-dense-3 .nc2-spec,.nc2-dense-3 .nc2-note{font-size:9px;}
  .nc2-dense-2 .nc2-sec,.nc2-dense-2 .nc2-band,.nc2-dense-2 .nc2-end-row,
  .nc2-dense-3 .nc2-sec,.nc2-dense-3 .nc2-band,.nc2-dense-3 .nc2-end-row{margin-top:7px;}
  .nc2-dense-2 .nc2-h,.nc2-dense-3 .nc2-h{margin-bottom:5px;}
  .nc2-dense-2 .nc2-kv > span,.nc2-dense-2 .nc2-kv > strong,
  .nc2-dense-3 .nc2-kv > span,.nc2-dense-3 .nc2-kv > strong{min-height:19px;}
  .nc2-dense-2 .nc2-sign-box,.nc2-dense-3 .nc2-sign-box{height:46px;}
  .nc2-dense-2 .nc2-stamp,.nc2-dense-3 .nc2-stamp{width:44px;height:44px;}
  .nc2-dense-2 .nc2-total-row,.nc2-dense-3 .nc2-total-row{min-height:22px;}
  .nc2-dense-2 .nc2-total-grand,.nc2-dense-3 .nc2-total-grand{min-height:34px;}
  .nc2-dense-3 .nc2-logo{height:34px;}
  .nc2-dense-3 .nc2-title{font-size:28px;}

  /* 서명 패드 */
  .nc2-modal{position:fixed;inset:0;z-index:9999;display:none;align-items:center;
    justify-content:center;padding:16px;background:rgba(17,17,17,.42);}
  .nc2-modal.show{display:flex;}
  .nc2-modal-card{width:min(760px,100%);max-height:calc(100dvh - 32px);overflow-y:auto;
    background:#fff;border-radius:22px;padding:22px;
    box-shadow:0 28px 70px rgba(17,17,17,.22);
    font-family:"UOPretendard","Pretendard",-apple-system,BlinkMacSystemFont,
      "Segoe UI","Noto Sans KR","Apple SD Gothic Neo",sans-serif;}
  .nc2-modal-title{font-size:23px;font-weight:950;letter-spacing:-.8px;color:#111;margin-bottom:8px;}
  .nc2-modal-text{font-size:14px;font-weight:750;line-height:1.55;color:#666;margin-bottom:16px;}
  .nc2-pad-wrap{position:relative;height:320px;border:2px solid #1B2A3A;border-radius:14px;
    background:#fff;overflow:hidden;touch-action:none;}
  #nc2SignCanvas{display:block;width:100%;height:100%;touch-action:none;}
  .nc2-pad-guide{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
    pointer-events:none;color:#C6C6C6;font-size:20px;font-weight:850;}
  .nc2-sign-actions{margin-top:12px;display:grid;grid-template-columns:1fr 1fr 1.3fr;gap:10px;}
  .nc2-btn{min-height:56px;border:0;border-radius:14px;background:#1B2A3A;color:#fff;
    font-size:17px;font-weight:900;cursor:pointer;font-family:inherit;}
  .nc2-btn.ghost{background:#F1F1EF;color:#333;border:1px solid rgba(17,17,17,.12);}
  .nc2-btn:disabled{opacity:.5;cursor:not-allowed;}

  @media (max-width:760px){
    .nc2-pad-wrap{height:240px;}
    .nc2-sign-actions{grid-template-columns:1fr 1fr;}
    .nc2-sign-actions .nc2-btn:not(.ghost){grid-column:1/-1;}
  }
  `;

  function injectStyle() {
    if (document.getElementById("nc2Style")) return;
    const style = document.createElement("style");
    style.id = "nc2Style";
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  /* ---------------------------------------------------------------
     공개
     --------------------------------------------------------------- */
  window.UODoc = {
    SUPPLIER: SUPPLIER,
    VAT_RATE: VAT_RATE,
    PAPER_W: PAPER_W,
    PAPER_H: PAPER_H,
    esc: esc,
    num: num,
    todayText: todayText,
    nowStamp: nowStamp,
    vatOf: vatOf,
    injectStyle: injectStyle,
    buildDoc: buildDoc,
    screenShell: screenShell,
    fitScreenDoc: fitScreenDoc,
    fitPaper: fitPaper,
    pageSlices: pageSlices,
    canvasToPdf: canvasToPdf,
    openSignPad: openSignPad,
    buildSignModal: buildSignModal,
    loadStamp: loadStamp,
    getStampSrc: getStampSrc,
    renderCanvas: renderCanvas,
    makePdfBlob: makePdfBlob,
    blobToBase64: blobToBase64
  };
})();
