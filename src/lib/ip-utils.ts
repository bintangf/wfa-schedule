// Utility functions for IP handling

export function extractIPv4(ipString: string): string {
  // Handle IPv6-mapped IPv4 addresses (::1 -> 127.0.0.1, ::ffff:192.168.1.1 -> 192.168.1.1)
  if (ipString === '::1') {
    return '127.0.0.1'
  }
  
  // Extract IPv4 from IPv6-mapped format
  if (ipString.startsWith('::ffff:')) {
    return ipString.substring(7)
  }
  
  // If it's already IPv4, return as is
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/
  if (ipv4Regex.test(ipString)) {
    return ipString
  }
  
  // For any other IPv6 or unknown format, return localhost
  return '127.0.0.1'
}

export function getClientIPv4(request: Request): string {
  // Try different headers for client IP
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfConnectingIp = request.headers.get('cf-connecting-ip')
  
  let clientIp = 'unknown'
  
  if (forwarded) {
    clientIp = forwarded.split(',')[0].trim()
  } else if (realIp) {
    clientIp = realIp
  } else if (cfConnectingIp) {
    clientIp = cfConnectingIp
  }
  
  return extractIPv4(clientIp)
}
