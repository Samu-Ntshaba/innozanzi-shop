// Only validated destination IDs may enter executable head markup.
export function googleTagBootstrap(adsId: string) {
  if (!/^AW-\d+$/.test(adsId)) return "";
  return `window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments);}
window.gtag=gtag;
gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
gtag('set','ads_data_redaction',true);
gtag('set','url_passthrough',false);
gtag('js',new Date());
(function(){
var analytics=/(?:^|; )innozanzi-consent=analytics(?:;|$)/.test(document.cookie);
var advertising=/(?:^|; )innozanzi-ad-consent=granted(?:;|$)/.test(document.cookie);
gtag('consent','update',{analytics_storage:analytics?'granted':'denied',ad_storage:advertising?'granted':'denied',ad_user_data:advertising?'granted':'denied',ad_personalization:'denied'});
var path=window.location.pathname;
var safePath=/^\\/(products|categories|gaming|policies)(\\/|$)/.test(path)||path==='/'?path:'/'+path.split('/')[1];
gtag('config','${adsId}',{page_location:window.location.origin+safePath,page_referrer:'',page_title:'Innozanzi Shop',allow_google_signals:false,allow_ad_personalization_signals:false});
})();`;
}
