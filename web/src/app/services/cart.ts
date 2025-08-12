import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
export type CartItem = { id:string; qty:number };
const KEY='cart.v1';

@Injectable({ providedIn:'root' })
export class CartService {
  private items = new Map<string, number>();
  private subj = new BehaviorSubject<CartItem[]>([]);
  items$ = this.subj.asObservable();

  constructor(){
    const raw = localStorage.getItem(KEY);
    if (raw) JSON.parse(raw).forEach((x:CartItem)=> this.items.set(x.id, x.qty));
    this.emit();
  }
  private persist(){ localStorage.setItem(KEY, JSON.stringify([...this.items].map(([id,qty])=>({id,qty})))); }
  private emit(){ this.subj.next([...this.items].map(([id,qty])=>({id,qty}))); this.persist(); }
  add(id:string, qty=1){ this.items.set(id, (this.items.get(id)||0)+qty); this.emit(); }
  remove(id:string){ this.items.delete(id); this.emit(); }
  setQty(id:string, qty:number){ qty<=0?this.items.delete(id):this.items.set(id, qty); this.emit(); }
  clear(){ this.items.clear(); this.emit(); }
}
