import 'zone.js/dist/zone-node';
import * as express from 'express';
import { enableProdMode as enableProd, Provider } from '@angular/core';
import { renderModuleFactory } from '@angular/platform-server';
import * as fs from 'fs';
import { Observable, Observer, from } from 'rxjs';
import { mergeMap, take } from 'rxjs/operators';

export interface ServerConfiguration {
  main: string;
  index: string;
  enableProdMode?: boolean;
  staticDirectory?: string;
  extraProviders?: Provider[];
}

/**
 * Create a single observable of a file system read
 * @param file the file path to read
 */
function readFile$(file: string): Observable<string> {
  return Observable.create((observer: Observer<string>) => {
    fs.readFile(file, 'utf8', (err, data) => {
      if (err) {
        observer.error(err);
      } else {
        observer.next(data);
        observer.complete();
      }
    });
  });
}

/**
 * Create the Angular Universal request handler
//  * @param config
 */
export function angularUniversal({ index, main, staticDirectory, enableProdMode = false, extraProviders }: ServerConfiguration) {
  if (enableProdMode) { enableProd(); }
  return (req: express.Request, res: express.Response) => {
    readFile$(index).pipe(

      mergeMap(document => {
        const url = req.path;
        const AppServerModuleNgFactory = require(main).AppServerModuleNgFactory;
        return from(renderModuleFactory(AppServerModuleNgFactory, { document, url, extraProviders: extraProviders as any }));
      }),
      take(1)

    ).subscribe(html => { res.send(html); });
  };
}
