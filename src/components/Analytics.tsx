import Script from "next/script";

/**
 * Volitelná analytika - Umami/Google Analytics/Microsoft Clarity. Každá
 * se zapne jen tehdy, když je pro ni v `.env` vyplněné ID/URL - appka bez
 * konfigurace nic nenačítá. Hodnoty čte server-side (Server Component),
 * takže nepotřebují `NEXT_PUBLIC_` prefix - nejde o tajemství, jen o ID
 * viditelné v HTML/network requestech stejně jako u každé jiné appky.
 */
export function Analytics() {
  const umamiScriptUrl = process.env.UMAMI_SCRIPT_URL;
  const umamiWebsiteId = process.env.UMAMI_WEBSITE_ID;
  const googleAnalyticsId = process.env.GOOGLE_ANALYTICS_ID;
  const clarityProjectId = process.env.CLARITY_PROJECT_ID;

  return (
    <>
      {umamiScriptUrl && umamiWebsiteId && (
        <Script
          src={umamiScriptUrl}
          data-website-id={umamiWebsiteId}
          strategy="afterInteractive"
        />
      )}

      {googleAnalyticsId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${googleAnalyticsId}');
            `}
          </Script>
        </>
      )}

      {clarityProjectId && (
        <Script id="microsoft-clarity" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "${clarityProjectId}");
          `}
        </Script>
      )}
    </>
  );
}

export default Analytics;
