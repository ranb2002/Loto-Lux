import { Injectable } from '@angular/core';
import { Http } from '@angular/http';
import 'rxjs/add/operator/toPromise';

import { Tirage } from '../models/tirage.model';
import { Service } from './';

@Injectable()
export class TirageService extends Service {
  constructor(private http: Http) {
    super('api/loteries');
  }

  recuperer(loterie: string, date: string): Promise<Tirage> {
    let url: string = this.construireURL([loterie, 'tirages', date]);

    return this.http.get(url)
      .toPromise()
      .then(response => response.json())
      .catch(this.handleError);
  }
}
