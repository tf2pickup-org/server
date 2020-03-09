import { Injectable, HttpService } from '@nestjs/common';
import { map, tap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Injectable()
export class DocumentsService {

  private repoEndpoint = 'https://raw.githubusercontent.com/tf2pickup-pl/documents/master';

  constructor(
    private http: HttpService,
  ) { }

  fetchDocument(documentName: string) {
    const url = `${this.repoEndpoint}/${documentName}`;
    return this.http.get(url).pipe(
      map(response => response.data),
      catchError(() => of(undefined)),
    ).toPromise();
  }

}
