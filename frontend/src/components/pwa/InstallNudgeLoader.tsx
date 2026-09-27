"use client";

import dynamic from "next/dynamic";

// Off the shared bundle: most visitors (desktop, installed) never see the card
const InstallNudge = dynamic(() => import("./InstallNudge"), { ssr: false });

export default InstallNudge;
