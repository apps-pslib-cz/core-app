import { SettingsDrawerWrapper } from "@/components/SettingsDrawerWrapper";

export default function LanguageLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {children}
      <SettingsDrawerWrapper />
    </>
  );
}

export function generateStaticParams() {
  return [{ lang: "cs" }, { lang: "en" }];
}
