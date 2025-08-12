import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ArtworksService, Artwork } from '../../services/artworks';
import { CartService } from '../../services/cart';

@Component({
  standalone: true,
  selector: 'app-detail',
  imports: [CommonModule, CurrencyPipe],
  templateUrl: './detail.html'
})
export class DetailComponent implements OnInit {
  private route = inject<ActivatedRoute>(ActivatedRoute);
  private api = inject<ArtworksService>(ArtworksService);
  public cart = inject<CartService>(CartService);

  art?: Artwork;

  ngOnInit() {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (slug) {
      this.api.get(slug).subscribe(a => this.art = a);
    }
  }
}
