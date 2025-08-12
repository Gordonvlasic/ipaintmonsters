import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export type Artwork = {
  id: string; slug: string; title: string; artist: string;
  medium: string; dimensions: { w: number; h: number; unit: string };
  year: number; price: number; currency: string;
  availability: 'available' | 'reserved' | 'sold';
  framed: boolean; style: string[]; tags: string[];
  images: { cover: string; thumb: string; alt: string; gallery?: string[] };
};

@Injectable({ providedIn: 'root' })
export class ArtworksService {
  private base = environment.apiBase;

  constructor(private http: HttpClient) {}

  list(params?: any) {
    return this.http.get<Artwork[]>(`${this.base}/artworks`, { params });
  }

  get(slug: string) {
    return this.http.get<Artwork>(`${this.base}/artworks/${slug}`);
  }

  checkoutEmail(payload: any) {
    return this.http.post(`${this.base}/checkout/email`, payload);
  }

  inquiry(payload: any) {
    return this.http.post(`${this.base}/inquiry`, payload);
  }
}
