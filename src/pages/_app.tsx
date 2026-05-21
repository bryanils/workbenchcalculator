import { type AppType } from "next/app";
import { Geist } from "next/font/google";

import { api } from "~/utils/api";
import { ThemeProvider } from "~/components/providers/ThemeProvider";

import "~/styles/globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const MyApp: AppType = ({ Component, pageProps }) => {
  return (
    <ThemeProvider>
      <div className={`${geist.variable} font-sans`}>
        <Component {...pageProps} />
      </div>
    </ThemeProvider>
  );
};

export default api.withTRPC(MyApp);
