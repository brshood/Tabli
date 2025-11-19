declare module 'react-window' {
  import * as React from 'react';

  export interface ListChildComponentProps {
    index: number;
    style: React.CSSProperties;
    data?: any;
    isScrolling?: boolean;
  }

  export interface FixedSizeListProps<T = any> {
    height: number;
    width?: number | string;
    itemCount: number;
    itemSize: number;
    className?: string;
    itemData?: T;
    initialScrollOffset?: number;
    children: (props: ListChildComponentProps) => React.ReactNode;
  }

  export class FixedSizeList<T = any> extends React.PureComponent<FixedSizeListProps<T>> {}
}

