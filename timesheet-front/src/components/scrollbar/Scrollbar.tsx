import { CSSProperties, FC, MutableRefObject, useEffect } from "react";

import SimpleBarReact, { Props as SimplebarProps } from "simplebar-react";
import "simplebar-react/dist/simplebar.min.css";
import "./ReactCustomScrollBar.css";

interface ScrollbarProps extends SimplebarProps {
  onViewScroll?: (props: {
    scrollLeft: number;
    clientHeight: number;
    scrollHeight: number;
    scrollTop: number;
    scrollWidth: number;
  }) => void;
  viewRef?: MutableRefObject<HTMLDivElement | null>;
  scrollBarWidth?: number;
  scrollBarHeight?: number;
  horizontalScrollLeftMargin?: number;
  verticalScrollTopMargin?: number;
}

export const Scrollbar: FC<ScrollbarProps> = ({
  children,
  onViewScroll,
  viewRef,
  scrollBarHeight = 11,
  scrollBarWidth = 11,
  horizontalScrollLeftMargin = 0,
  verticalScrollTopMargin = 0,
  ...props
}) => {
  useEffect(() => {
    const handleScroll = (e: any) => {
      if (onViewScroll) {
        const { scrollLeft, clientHeight, scrollHeight, scrollTop, scrollWidth } = e.currentTarget;
        onViewScroll?.({
          scrollLeft,
          scrollHeight,
          scrollTop,
          scrollWidth,
          clientHeight
        });
      }
    };
    const currentView = viewRef?.current;

    if (onViewScroll && currentView) {
      currentView.addEventListener("scroll", handleScroll, true);
    }
    return () => {
      if (currentView) {
        currentView.removeEventListener("scroll", handleScroll, true);
      }
    };
  }, [onViewScroll, viewRef]);

  return (
    <SimpleBarReact
      {...props}
      style={
        {
          "--simplebar-react-scrollwidth": `${scrollBarWidth}px`,
          "--simplebar-react-scrollheight": `${scrollBarHeight}px`,
          "--simplebar-react-horizontalLeftMargin": `${horizontalScrollLeftMargin}px`,
          "--simplebar-react-verticalTopMargin": `${verticalScrollTopMargin}px`,
          ...props.style
        } as CSSProperties
      }
      scrollableNodeProps={{
        ...props.scrollableNodeProps,
        ref: viewRef
      }}
      classNames={{
        ...props.classNames
      }}>
      {children}
    </SimpleBarReact>
  );
};
