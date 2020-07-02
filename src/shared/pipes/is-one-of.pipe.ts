import { ArgumentMetadata, Injectable, PipeTransform, BadRequestException } from '@nestjs/common';

@Injectable()
export class IsOneOfPipe implements PipeTransform {

  constructor(
    private choices: string[],
  ) { }

  transform(value: string, metadata: ArgumentMetadata) {
    if (!this.choices.includes(value)) {
      throw new BadRequestException(`${metadata.data} must be on of ${this.choices.join(', ')}`);
    }
    
    return value;
  }
}
