export function parseDeviceName(ua = typeof navigator !== "undefined" ? navigator.userAgent : "") {
  if (!ua || typeof ua !== "string") return "Web Device";

  let os = "Web Device";
  if (/iphone/i.test(ua)) {
    os = "iPhone";
  } else if (/ipad/i.test(ua)) {
    os = "iPad";
  } else if (/android/i.test(ua)) {
    if (/mobile/i.test(ua)) {
      os = "Android Phone";
    } else {
      os = "Android Tablet";
    }
  } else if (/macintosh|mac os x/i.test(ua)) {
    os = "MacBook / Mac";
  } else if (/windows/i.test(ua)) {
    os = "Windows PC";
  } else if (/linux/i.test(ua)) {
    os = "Linux PC";
  }

  let browser = "";
  if (/edg/i.test(ua)) {
    browser = "Edge";
  } else if (/chrome|crios/i.test(ua)) {
    browser = "Chrome";
  } else if (/firefox|fxios/i.test(ua)) {
    browser = "Firefox";
  } else if (/safari/i.test(ua) && !/chrome|crios|android/i.test(ua)) {
    browser = "Safari";
  } else if (/opera|opr/i.test(ua)) {
    browser = "Opera";
  }

  return browser ? `${os} (${browser})` : os;
}
