export function directionsUrl(point: { latitude: number; longitude: number }) {
  return `https://www.google.com/maps/dir/?api=1&destination=${point.latitude.toFixed(6)},${point.longitude.toFixed(6)}`;
}

export function telegramUrl(username: string) {
  return `https://t.me/${username.replace(/^@/, '')}`;
}

export function instagramUrl(username: string) {
  return `https://instagram.com/${username.replace(/^@/, '')}`;
}
