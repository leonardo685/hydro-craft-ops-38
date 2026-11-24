import { afterEach, describe, expect, it, vi } from "vitest";
import { captureQRPhoto } from "./qr-photo-capture";

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

function cameraRegion(readyState: number = HTMLMediaElement.HAVE_CURRENT_DATA) {
  const region = document.createElement("div");
  region.id = "scanner";
  const video = document.createElement("video");
  Object.defineProperties(video, {
    readyState: { value: readyState },
    videoWidth: { value: 1920 },
    videoHeight: { value: 1080 },
  });
  region.appendChild(video);
  document.body.appendChild(region);
  return video;
}

describe("captureQRPhoto", () => {
  it("captures the full camera frame as a JPEG for QR decoding", async () => {
    const video = cameraRegion();
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback: BlobCallback) => {
      callback(new Blob(["photo"], { type: "image/jpeg" }));
    });

    const photo = await captureQRPhoto("scanner");

    expect(photo).toBeInstanceOf(File);
    expect(photo.type).toBe("image/jpeg");
    expect(photo.name).toMatch(/^etiqueta-\d+\.jpg$/);
    expect(drawImage).toHaveBeenCalledWith(video, 0, 0, 1920, 1080);
  });

  it("asks the user to wait when the camera has no frame yet", async () => {
    cameraRegion(HTMLMediaElement.HAVE_NOTHING);

    await expect(captureQRPhoto("scanner")).rejects.toThrow("A câmera ainda não está pronta");
  });
});
