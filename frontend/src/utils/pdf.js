import html2pdf from 'html2pdf.js';

export async function exportPDF(element, filename = 'relatorio.pdf', landscape = true) {
  // Temporarily remove overflow constraints so html2canvas captures full table width
  const scrollEls = Array.from(element.querySelectorAll('*')).filter(el => {
    const s = window.getComputedStyle(el);
    return s.overflowX === 'auto' || s.overflowX === 'scroll';
  });
  const saved = scrollEls.map(el => el.style.overflowX);
  scrollEls.forEach(el => { el.style.overflowX = 'visible'; });

  // Hide buttons marked with data-pdf-hide inside the element
  const hidden = Array.from(element.querySelectorAll('[data-pdf-hide]'));
  hidden.forEach(el => { el.style.display = 'none'; });

  try {
    const opt = {
      margin: [8, 8, 8, 8],
      filename,
      image: { type: 'png' },
      html2canvas: {
        scale: 3,
        useCORS: true,
        logging: false,
        scrollX: 0,
        scrollY: -window.scrollY,
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: landscape ? 'landscape' : 'portrait' },
    };
    await html2pdf().set(opt).from(element).save();
  } finally {
    scrollEls.forEach((el, i) => { el.style.overflowX = saved[i]; });
    hidden.forEach(el => { el.style.display = ''; });
  }
}

export const btnPDF = {
  padding: '5px 12px', fontSize: '0.78rem', fontWeight: 600,
  background: '#dc2626', color: '#fff', border: 'none',
  borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
};
