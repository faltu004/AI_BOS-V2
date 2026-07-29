import { InstallPrompt } from "./InstallPrompt";
import { OfflineBanner } from "./OfflineBanner";
import { UpdateToast } from "./UpdateToast";
import { useBackgroundSyncNotice } from "./useBackgroundSyncNotice";

/** Mounted once per portal inside the toast/confirm-dialog provider tree. */
export function PwaChrome() {
  useBackgroundSyncNotice();

  return (
    <>
      <OfflineBanner />
      <UpdateToast />
      <InstallPrompt />
    </>
  );
}
