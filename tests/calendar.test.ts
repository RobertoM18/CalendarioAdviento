import { describe, it, expect } from 'vitest';
import { nextUnlock, unlockDate, countdown, safeMusicUrl } from '../src/lib';
describe('Calendario fijo de Ecuador',()=>{
 it('espera al 1 de diciembre antes del inicio',()=>expect(nextUnlock(Date.parse('2026-11-24T23:59:59-05:00'))).toBe(Date.parse('2026-12-01T05:00:00Z')));
 it('cambia exactamente a medianoche de Ecuador',()=>{expect(nextUnlock(Date.parse('2026-12-01T04:59:59Z'))).toBe(Date.parse(unlockDate(1)));expect(nextUnlock(Date.parse('2026-12-01T05:00:00Z'))).toBe(Date.parse(unlockDate(2)));});
 it.each(['2026-12-15T05:00:00Z','2026-12-25T12:00:00Z','2027-01-01T00:00:00Z','2035-12-01T00:00:00Z'])('no reinicia después del último día: %s',date=>expect(nextUnlock(Date.parse(date))).toBeNull());
 it('expresa días y nunca genera contadores negativos',()=>{expect(countdown(90061000)).toEqual({days:1,hours:1,minutes:1,seconds:1});expect(countdown(-1000)).toEqual({days:0,hours:0,minutes:0,seconds:0});});
 it('rechaza protocolos ejecutables y HTTP en canciones',()=>{expect(safeMusicUrl('javascript:alert(1)')).toBe('');expect(safeMusicUrl('http://example.com/song.mp3')).toBe('');expect(safeMusicUrl('https://open.spotify.com/track/test')).toBe('https://open.spotify.com/track/test');});
});
