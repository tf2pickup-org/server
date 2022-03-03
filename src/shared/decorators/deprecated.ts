import { Header } from '@nestjs/common';

export const Deprecated = () => Header('Warning', '299 - "Deprecated API"');
