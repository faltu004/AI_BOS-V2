!include "WinMessages.nsh"

; Shared AI BOS installer presentation. This file intentionally customizes only
; MUI2 presentation and page copy; installation and uninstallation semantics stay
; in electron-builder and the product-specific hooks.
!define MUI_ABORTWARNING
!define MUI_BGCOLOR "FFFFFF"
!define MUI_TEXTCOLOR "0B2447"
!define MUI_INSTFILESPAGE_PROGRESSBAR "smooth"

!ifdef AIBOS_EMPLOYEE_INSTALLER
  !define AIBOS_INSTALLING_SUBTITLE "Please wait while Setup installs the application and required services."
!else
  !define AIBOS_INSTALLING_SUBTITLE "Please wait while Setup installs the application."
!endif

!macro customHeader
  SetFont "Segoe UI" 9
  BrandingText "${PRODUCT_NAME} ${VERSION}  |  WorknAI Technology"
!macroend

!macro customWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "Welcome to ${PRODUCT_NAME} Setup"
  !define MUI_WELCOMEPAGE_TITLE_3LINES
  !define MUI_WELCOMEPAGE_TEXT "Enterprise AI Management Platform$\r$\n$\r$\nSetup will install ${PRODUCT_NAME} on this computer.$\r$\n$\r$\nSelect Next to continue."
  !insertmacro MUI_PAGE_WELCOME
!macroend

!macro customPageAfterChangeDir
  ; These settings are consumed by the immediately following install-files page.
  !define MUI_PAGE_HEADER_TEXT "Installing ${PRODUCT_NAME}"
  !define MUI_PAGE_HEADER_SUBTEXT "${AIBOS_INSTALLING_SUBTITLE}"
  !define MUI_PAGE_CUSTOMFUNCTION_SHOW AiBosInstallPageShow
!macroend

!ifndef BUILD_UNINSTALLER
  Function AiBosInstallPageShow
    ; Keep the native progress control and its real installer position, while using
    ; the AI BOS blue palette instead of the legacy default green theme.
    FindWindow $0 "#32770" "" $HWNDPARENT
    GetDlgItem $1 $0 1004
    System::Call 'UxTheme::SetWindowTheme(p r1, w "", w "")i.r2'
    SendMessage $1 ${PBM_SETBARCOLOR} 0 0x00D47800
    SendMessage $1 ${PBM_SETBKCOLOR} 0 0x00F6EEE8
  FunctionEnd
!endif

!macro customFinishPage
  Function AiBosStartApp
    ${if} ${isUpdated}
      StrCpy $1 "--updated"
    ${else}
      StrCpy $1 ""
    ${endif}
    ${StdUtils.ExecShellAsUser} $0 "$launchLink" "open" "$1"
  FunctionEnd

  !define MUI_FINISHPAGE_TITLE "${PRODUCT_NAME} is ready"
  !define MUI_FINISHPAGE_TITLE_3LINES
  !define MUI_FINISHPAGE_TEXT "${PRODUCT_NAME} was installed successfully.$\r$\n$\r$\nSelect Finish to close Setup."
  !ifndef HIDE_RUN_AFTER_FINISH
    !define MUI_FINISHPAGE_RUN
    !define MUI_FINISHPAGE_RUN_FUNCTION "AiBosStartApp"
    !define MUI_FINISHPAGE_RUN_TEXT "Launch ${PRODUCT_NAME}"
  !endif
  !insertmacro MUI_PAGE_FINISH
!macroend

!macro customUnWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "Remove ${PRODUCT_NAME}"
  !define MUI_WELCOMEPAGE_TITLE_3LINES
  !define MUI_WELCOMEPAGE_TEXT "This wizard will remove ${PRODUCT_NAME} from this computer.$\r$\n$\r$\nSelect Next to continue."
  !insertmacro MUI_UNPAGE_WELCOME
!macroend
