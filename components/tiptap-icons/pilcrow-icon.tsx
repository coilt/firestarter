import { memo } from "react"

type SvgProps = React.ComponentPropsWithoutRef<"svg">

export const PilcrowIcon = memo(({ className, ...props }: SvgProps) => {
  return (
    <svg
      width="24"
      height="24"
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M13 4H9.5C7.01472 4 5 6.01472 5 8.5C5 10.9853 7.01472 13 9.5 13H13V20C13 20.5523 13.4477 21 14 21C14.5523 21 15 20.5523 15 20V5C15 4.44772 14.5523 4 14 4H13ZM13 11H9.5C8.11929 11 7 9.88071 7 8.5C7 7.11929 8.11929 6 9.5 6H13V11Z"
        fill="currentColor"
      />
      <path
        d="M17 4C16.4477 4 16 4.44772 16 5V20C16 20.5523 16.4477 21 17 21C17.5523 21 18 20.5523 18 20V5C18 4.44772 17.5523 4 17 4Z"
        fill="currentColor"
      />
    </svg>
  )
})

PilcrowIcon.displayName = "PilcrowIcon"
