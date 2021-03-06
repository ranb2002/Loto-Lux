import express = require('express');

import { SelectionBusiness } from './../app/business';
import { Controller } from './';

export class SelectionController extends Controller {
  //Recupère les sélections de l'utilisateur
  recuperer(req: express.Request, res: express.Response): void {
    let loterie: string = req.params.loterie;
    let date: string = req.params.date;
    let courriel: string = req.params.courriel;
    let token: string = req.params.token;
    let business: SelectionBusiness = new SelectionBusiness(courriel, token);

    business.recuperer(loterie, date)
      .then((selections) => res.send(selections))
      .catch((erreur: any) => this.gererErreur(res, erreur));
  }

  //Ajoute les sélections de l'utilisateur dans la base de données
  ajouter(req: express.Request, res: express.Response): void {
    let loterie: string = req.params.loterie;
    let date: string = req.params.date;
    let courriel: string = req.params.courriel;
    let token: string = req.params.token;
    let business: SelectionBusiness = new SelectionBusiness(courriel, token);
    let selections: string[][] = req.body as string[][];

    business.ajouter(loterie, date, selections)
      .then(() => res.send(true))
      .catch((erreur: any) => this.gererErreur(res, erreur));
  }

  //Supprime les sélections de l'utilisateur dans la base de dommées
  supprimer(req: express.Request, res: express.Response): void {
    let loterie: string = req.params.loterie;
    let date: string = req.params.date;
    let courriel: string = req.params.courriel;
    let token: string = req.params.token;
    let business: SelectionBusiness = new SelectionBusiness(courriel, token);
    let id: string = req.params.id as string;

    business.supprimer(loterie, date, id)
      .then(() => res.send(true))
      .catch((erreur: any) => this.gererErreur(res, erreur));
  }
}
