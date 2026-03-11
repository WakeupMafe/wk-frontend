import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import ReactDOM from "react-dom/client";
import LogrosFase1PdfTemplate from "./LogrosFase1PdfTemplate";

export async function downloadLogrosFase1Pdf(data) {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.top = "0";
  container.style.left = "-99999px";
  container.style.width = "820px";
  container.style.background = "#ffffff";
  container.style.zIndex = "-1";
  document.body.appendChild(container);

  const root = ReactDOM.createRoot(container);

  const fechaDescarga = new Date().toLocaleDateString("es-CO");

  root.render(
    <LogrosFase1PdfTemplate {...data} fechaDescarga={fechaDescarga} />,
  );

  await new Promise((resolve) => setTimeout(resolve, 400));

  const canvas = await html2canvas(container, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
  });

  const imgData = canvas.toDataURL("image/png");

  const pdf = new jsPDF("p", "mm", "a4");
  const pdfWidth = 210;
  const pageHeight = 297;

  const imgWidth = pdfWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  const safeName = String(data?.pacienteNombre || "paciente")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^\w-]/g, "");

  pdf.save(`informe_wakeup_${safeName}.pdf`);

  root.unmount();
  container.remove();
}
