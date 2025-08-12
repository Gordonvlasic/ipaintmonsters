import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterOutlet } from '@angular/router';
import { CartService } from '../../services/cart';

@Component({
  standalone: true,
  selector: 'app-layout',
  imports: [CommonModule, RouterOutlet, RouterLink],
  templateUrl: './layout.html',
  styleUrls: ['./layout.css'],
})
export class LayoutComponent implements OnInit {
  cartCount = 0;
  currentYear = new Date().getFullYear();

  private cart = inject(CartService);

  ngOnInit(): void {
    this.cart.items$.subscribe(items => {
      this.cartCount = items.reduce((sum, it) => sum + it.qty, 0);
    });
  }
}
