interface NetworkInformation extends EventTarget {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

interface NavigatorWithConnection extends Navigator {
  connection?: NetworkInformation;
}

interface Window {
  gtag?: (
    command: string,
    action: string,
    params?: Record<string, string | number | boolean | undefined>,
  ) => void;
}
