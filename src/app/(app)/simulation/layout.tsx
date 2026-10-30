import { Instrument_Serif } from "next/font/google";

const instrument = Instrument_Serif({
  weight: "400",
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-instrument",
  display: "swap",
});

export default function SimulationLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${instrument.variable} h-dvh`}>{children}</div>;
}
