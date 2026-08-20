export type RemoteScreenFrame = {
  mimeType?: unknown;
  data?: unknown;
  capturedAt?: unknown;
};

export function remoteFrameToImageSource(
  frame: RemoteScreenFrame,
): string | null {
  if (
    frame.mimeType !==
      "image/jpeg" ||
    typeof frame.data !==
      "string" ||
    frame.data.length === 0 ||
    frame.data.length % 4 !==
      0 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(
      frame.data,
    ) ||
    typeof frame.capturedAt !==
      "string" ||
    !Number.isFinite(
      Date.parse(
        frame.capturedAt,
      ),
    )
  ) {
    return null;
  }

  return (
    "data:image/jpeg;base64," +
    frame.data
  );
}
