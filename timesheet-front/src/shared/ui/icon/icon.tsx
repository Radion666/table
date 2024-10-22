import { FC, SVGProps, forwardRef, memo } from "react";

import { clsx } from "clsx";

import styles from "./styles.module.css";
import * as svgIcons from "./svgs/index";

export type iconTypes = keyof typeof svgIcons;

interface IconProps extends SVGProps<SVGSVGElement> {
  name: iconTypes;
  size?: number;
}

const IconsList = Object(svgIcons);

export const Icon = memo(
  forwardRef<SVGSVGElement, IconProps>((props, iconRef) => {
    const { name, size } = props;

    const IconComponent: FC<SVGProps<SVGSVGElement>> = IconsList[name];

    return (
      <IconComponent
        ref={iconRef}
        {...props}
        className={clsx(styles.container, props.className)}
        {...(size && {
          width: size,
          height: size
        })}
      />
    );
  })
);
