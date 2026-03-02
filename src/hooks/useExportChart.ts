import html2canvas from 'html2canvas';

export async function useExportChart(elementRef: React.RefObject<HTMLDivElement>, fileName: string) {
  if (!elementRef.current) {
    alert('Gráfico não encontrado');
    return;
  }

  try {
    const canvas = await html2canvas(elementRef.current, {
      backgroundColor: '#ffffff',
      scale: 2,
    });

    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `${fileName}-${new Date().toISOString().split('T')[0]}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Erro ao exportar gráfico:', error);
    alert('Erro ao exportar gráfico');
  }
}
