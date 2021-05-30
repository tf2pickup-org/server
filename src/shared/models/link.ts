interface LinkProps {
  href: string;
  title?: string;
}

/**
 * HATEOAS link.
 */
export class Link {
  constructor(props: LinkProps) {
    this.href = props.href;
    this.title = props.title;
  }

  readonly href: string;
  readonly title?: string;
}
