export async function captureQRPhoto(regionId: string): Promise<File> {
  const region = document.getElementById(regionId);
  const video = region?.querySelector("video");

  if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !video.videoWidth || !video.videoHeight) {
    throw new Error("A câmera ainda não está pronta. Aguarde a imagem aparecer e tente novamente.");
  }

  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Não foi possível capturar a foto da etiqueta.");

  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.95));
  if (!blob) throw new Error("Não foi possível capturar a foto da etiqueta.");

  return new File([blob], `etiqueta-${Date.now()}.jpg`, { type: "image/jpeg" });
}
