import { Avatar } from '@/components/ui/catalyst/avatar'
import {
  Dropdown,
  DropdownButton,
  DropdownDivider,
  DropdownItem,
  DropdownLabel,
  DropdownMenu,
} from '@/components/ui/catalyst/dropdown'
import {
  Sidebar,
  SidebarBody,
  SidebarFooter,
  SidebarHeader,
  SidebarHeading,
  SidebarItem,
  SidebarLabel,
  SidebarSection,
  SidebarSpacer,
} from '@/components/ui/catalyst/sidebar'

import {
  ArrowRightStartOnRectangleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  Cog8ToothIcon,
  LightBulbIcon,
  PlusIcon,
  ShieldCheckIcon,
  UserIcon,
  DocumentIcon,
} from '@heroicons/react/16/solid'
import {
  QuestionMarkCircleIcon,
  SparklesIcon,
  PencilIcon,
} from '@heroicons/react/20/solid'

import { HugeiconsIcon } from '@hugeicons/react'
import { DashboardSquare02Icon } from '@hugeicons/core-free-icons'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

interface LeftPanelProps {
  title: string
  onTitleChange: (value: string) => void
  sheetCount: number
  layoutId: string
  onSave: () => void
  saveState: SaveState
}

const SAVE_LABEL: Record<SaveState, string> = {
  idle: 'Save Document',
  saving: 'Saving…',
  saved: 'Saved',
  error: 'Error — retry',
}

export default function LeftPanel({
  title,
  onTitleChange,
  sheetCount,
  layoutId,
  onSave,
  saveState,
}: LeftPanelProps) {
  return (
    <Sidebar className='h-full'>
      <SidebarHeader>
        <Dropdown>
          <DropdownButton as={SidebarItem} className='lg:mb-2.5'>
            <svg height="64" viewBox="0 0 344 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Firestarter">
              <path d="M70 48.0994L70 69.6182L57.3615 82.2568L57.3615 61.1238L46.6145 71.8708L46.6145 54.5882L46.4741 54.7271L36.2437 64.958L36.2437 82.2568L23 71.4498L23 46.7443L40.8258 28.9179L40.8258 42.4452L46.116 37.1565L46.116 17L60.5058 31.3897L60.5058 57.5965L70 48.0994Z" fill="#EF382D"/>
              <path d="M60.506 31.3887L60.506 57.5955L57.3618 61.1227L46.6147 71.8697L46.6147 54.5871L60.506 31.3887Z" fill="#F36E21"/>
              <path d="M36.2437 64.9581L36.2437 82.2568L23 71.4498L23 54.04L36.2437 64.9581Z" fill="#F6BD28"/>
              <path d="M46.6145 54.5888L36.2437 64.9586L23 54.0406L23 46.7449L30.8069 38.9375L46.6145 54.5888Z" fill="#E91D25"/>
              <path d="M60.506 31.3897L46.6147 55.7825L46.5021 55.9813L46.4744 54.7271L46.1162 37.1565L46.1162 17L60.506 31.3897Z" fill="#F6BD28"/>
              <path d="M310.484 48.7402L310.778 52.9402C311.576 50.0842 313.382 48.7402 316.322 48.7402H320.774V51.8482H316.322C312.92 51.8482 311.324 53.9062 311.324 57.7282V67.8922H318.59V71.0002H302V67.8922H307.796V51.8482H302V48.7402H310.484Z" fill="url(#logo-p0)"/>
              <path d="M280 59.8703C280 52.8143 284.032 48.2363 290.206 48.2363C295.12 48.2363 299.488 51.4703 299.866 59.3663L299.908 60.9623H283.78C284.074 65.4983 286.384 68.1443 290.206 68.1443C292.6 68.1443 294.742 66.7583 295.75 64.4063L299.53 64.7003C298.228 68.9003 294.49 71.5043 290.206 71.5043C284.032 71.5043 280 66.9263 280 59.8703ZM283.822 57.8543H296.044C295.414 53.1923 292.936 51.5963 290.206 51.5963C286.678 51.5963 284.41 53.9063 283.822 57.8543Z" fill="url(#logo-p1)"/>
              <path d="M264 42.8604H267.528V48.7403H276.432V51.8484H267.528V64.8684C267.528 66.7584 268.536 67.8923 270.426 67.8923H276.39V71.0004H270.426C265.89 71.0004 264 68.5644 264 64.8684V51.8484V48.7403V42.8604Z" fill="url(#logo-p2)"/>
              <path d="M249.484 48.7402L249.778 52.9402C250.576 50.0842 252.382 48.7402 255.322 48.7402H259.774V51.8482H255.322C251.92 51.8482 250.324 53.9062 250.324 57.7282V67.8922H257.59V71.0002H241V67.8922H246.796V51.8482H241V48.7402H249.484Z" fill="url(#logo-p3)"/>
              <path d="M217.378 55.2923C218.218 51.0923 221.872 48.2363 226.492 48.2363C231.868 48.2363 235.438 51.3443 235.438 57.5603V66.5063C235.438 67.4303 235.858 67.8923 236.824 67.8923H237.706V71.0003H236.614C233.926 71.0003 232.33 69.5723 231.952 67.5563C231.07 69.6143 228.55 71.5043 225.022 71.5043C220.612 71.5043 217 69.1523 217 65.1623C217 60.5843 220.486 59.4083 225.4 58.4843L231.91 57.1823C231.868 53.4023 229.768 51.5963 226.492 51.5963C223.72 51.5963 221.704 53.2763 221.158 55.5863L217.378 55.2923ZM220.696 65.1623C220.696 66.9263 222.208 68.3963 225.484 68.3963C229.138 68.3543 231.994 65.8343 231.994 61.4243V60.3323L226.744 61.2563C223.426 61.8443 220.696 62.0543 220.696 65.1623Z" fill="url(#logo-p4)"/>
              <path d="M201.822 42.8604H205.35V48.7403H214.254V51.8484H205.35V64.8684C205.35 66.7584 206.358 67.8923 208.248 67.8923H214.212V71.0004H208.248C203.712 71.0004 201.822 68.5644 201.822 64.8684V51.8484V48.7403V42.8604Z" fill="url(#logo-p5)"/>
              <path d="M194.616 55.6283C194.112 53.1083 191.718 51.5963 188.862 51.5963C186.552 51.5963 184.368 52.7723 184.41 55.0823C184.41 57.4763 187.266 58.0223 189.702 58.6943C193.902 59.7443 198.312 61.0883 198.312 65.3303C198.312 69.6983 193.986 71.5043 189.618 71.5043C184.494 71.5043 180.294 68.6063 180 63.9863L183.654 63.7343C184.074 66.4223 186.51 68.1443 189.618 68.1443C192.012 68.1443 194.574 67.5143 194.574 65.1203C194.574 62.6843 191.424 62.3063 189.072 61.7603C184.998 60.7943 180.714 59.3243 180.714 55.2503C180.672 50.7563 184.704 48.2363 189.24 48.2363C193.86 48.2363 197.43 51.0503 198.144 55.3763L194.616 55.6283Z" fill="url(#logo-p6)"/>
              <path d="M157 59.8703C157 52.8143 161.032 48.2363 167.206 48.2363C172.12 48.2363 176.488 51.4703 176.866 59.3663L176.908 60.9623H160.78C161.074 65.4983 163.384 68.1443 167.206 68.1443C169.6 68.1443 171.742 66.7583 172.75 64.4063L176.53 64.7003C175.228 68.9003 171.49 71.5043 167.206 71.5043C161.032 71.5043 157 66.9263 157 59.8703ZM160.822 57.8543H173.044C172.414 53.1923 169.936 51.5963 167.206 51.5963C163.678 51.5963 161.41 53.9063 160.822 57.8543Z" fill="url(#logo-p7)"/>
              <path d="M143.484 48.7402L143.778 52.9402C144.576 50.0842 146.382 48.7402 149.322 48.7402H153.774V51.8482H149.322C145.92 51.8482 144.324 53.9062 144.324 57.7282V67.8922H151.59V71.0002H135V67.8922H140.796V51.8482H135V48.7402H143.484Z" fill="url(#logo-p8)"/>
              <path d="M125.017 48.7397V67.8917H132.619V70.9997H112.669V67.8917H121.489V51.8477H113.509V48.7397H125.017ZM121.027 45.4217V41.1797H125.017V45.4217H121.027Z" fill="url(#logo-p9)"/>
              <path d="M87.9482 41.1797H106.26V44.7077H91.5602V54.7037H105.504V58.1477H91.5602V70.9997H87.9482V41.1797Z" fill="url(#logo-p10)"/>
              <defs>
                <linearGradient id="logo-p0" x1="188.013" y1="30.0002" x2="188.013" y2="87.0002" gradientUnits="userSpaceOnUse"><stop stopColor="white"/><stop offset="1" stopColor="#999999"/></linearGradient>
                <linearGradient id="logo-p1" x1="189.642" y1="30.0003" x2="189.642" y2="87.0003" gradientUnits="userSpaceOnUse"><stop stopColor="white"/><stop offset="1" stopColor="#999999"/></linearGradient>
                <linearGradient id="logo-p2" x1="189.208" y1="30.0003" x2="189.208" y2="87.0004" gradientUnits="userSpaceOnUse"><stop stopColor="white"/><stop offset="1" stopColor="#999999"/></linearGradient>
                <linearGradient id="logo-p3" x1="195.003" y1="30.0002" x2="195.003" y2="87.0002" gradientUnits="userSpaceOnUse"><stop stopColor="white"/><stop offset="1" stopColor="#999999"/></linearGradient>
                <linearGradient id="logo-p4" x1="195.935" y1="30.0003" x2="195.935" y2="87.0003" gradientUnits="userSpaceOnUse"><stop stopColor="white"/><stop offset="1" stopColor="#999999"/></linearGradient>
                <linearGradient id="logo-p5" x1="197.961" y1="30.0003" x2="197.961" y2="87.0004" gradientUnits="userSpaceOnUse"><stop stopColor="white"/><stop offset="1" stopColor="#999999"/></linearGradient>
                <linearGradient id="logo-p6" x1="203.548" y1="30.0003" x2="203.548" y2="87.0003" gradientUnits="userSpaceOnUse"><stop stopColor="white"/><stop offset="1" stopColor="#999999"/></linearGradient>
                <linearGradient id="logo-p7" x1="206.404" y1="30.0003" x2="206.404" y2="87.0003" gradientUnits="userSpaceOnUse"><stop stopColor="white"/><stop offset="1" stopColor="#999999"/></linearGradient>
                <linearGradient id="logo-p8" x1="208.621" y1="30.0002" x2="208.621" y2="87.0002" gradientUnits="userSpaceOnUse"><stop stopColor="white"/><stop offset="1" stopColor="#999999"/></linearGradient>
                <linearGradient id="logo-p9" x1="211.726" y1="29.9997" x2="211.726" y2="86.9997" gradientUnits="userSpaceOnUse"><stop stopColor="white"/><stop offset="1" stopColor="#999999"/></linearGradient>
                <linearGradient id="logo-p10" x1="211.727" y1="29.9997" x2="211.727" y2="86.9997" gradientUnits="userSpaceOnUse"><stop stopColor="white"/><stop offset="1" stopColor="#999999"/></linearGradient>
              </defs>
            </svg>
            <ChevronDownIcon />
          </DropdownButton>
          <DropdownMenu className='min-w-80 lg:min-w-64' anchor='bottom start'>
            <DropdownItem href='/teams/1/settings'>
              <Cog8ToothIcon />
              <DropdownLabel>Settings</DropdownLabel>
            </DropdownItem>
            <DropdownDivider />
            <DropdownItem href='/teams/1'>
              <Avatar slot='icon' src='/tailwind-logo.svg' />
              <DropdownLabel>Tailwind Labs</DropdownLabel>
            </DropdownItem>
            <DropdownItem href='/teams/2'>
              <Avatar
                slot='icon'
                initials='WC'
                className='bg-purple-500 text-white'
              />
              <DropdownLabel>Workcation</DropdownLabel>
            </DropdownItem>
            <DropdownDivider />
            <DropdownItem href='/teams/create'>
              <PlusIcon />
              <DropdownLabel>New team&hellip;</DropdownLabel>
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
        <SidebarSection className='mt-4'>
          <SidebarHeading>Document</SidebarHeading>
          <div className='px-2 pt-1 space-y-2'>
            <input
              value={title}
              onChange={(event) => onTitleChange(event.target.value)}
              placeholder='Untitled document'
              className='w-full rounded-md border border-zinc-950/10 bg-white px-3 py-2 text-sm text-zinc-950 outline-none transition-colors hover:border-zinc-950/20 focus:border-zinc-950/40 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:hover:border-white/15 dark:focus:border-white/30'
            />

            <div className='text-xs text-zinc-500 dark:text-zinc-400'>
              {sheetCount} sheets · {layoutId}
            </div>
          </div>
        </SidebarSection>
        <SidebarSection className='max-lg:hidden'>
          <SidebarItem href='/dashboard'>
            <HugeiconsIcon
              icon={DashboardSquare02Icon}
              size={24}
              color='currentColor'
              strokeWidth={1.5}
            />
            <SidebarLabel>Dashboard</SidebarLabel>
          </SidebarItem>
        </SidebarSection>
        <SidebarSection className='max-lg:hidden'>
          <SidebarItem href='/search'>
            <DocumentIcon />
            <SidebarLabel>Templates</SidebarLabel>
          </SidebarItem>
          <SidebarItem href='/inbox'>
            <PencilIcon />
            <SidebarLabel>Created by me</SidebarLabel>
          </SidebarItem>
        </SidebarSection>
      </SidebarHeader>
      <SidebarBody>
        <SidebarSpacer />
        <SidebarSection>
          <div className='px-2'>
            <button
              onClick={onSave}
              disabled={saveState === 'saving'}
              className='cursor-pointer w-full rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200'
            >
              {SAVE_LABEL[saveState]}
            </button>
          </div>
        </SidebarSection>
      </SidebarBody>
      {/* <SidebarFooter className='max-lg:hidden'>
        <Dropdown>
          <DropdownButton as={SidebarItem}>
            <span className='flex min-w-0 items-center gap-3'>
              <Avatar
                src='/profile-photo.jpg'
                className='size-10'
                square
                alt=''
              />
              <span className='min-w-0'>
                <span className='block truncate text-sm/5 font-medium text-zinc-950 dark:text-white'>
                  Alan
                </span>
                <span className='block truncate text-xs/5 font-normal text-zinc-500 dark:text-zinc-400'>
                  alan@aixplain.com
                </span>
              </span>
            </span>
            <ChevronUpIcon />
          </DropdownButton>
          <DropdownMenu className='min-w-64' anchor='top start'>
            <DropdownItem href='/my-profile'>
              <UserIcon />
              <DropdownLabel>My profile</DropdownLabel>
            </DropdownItem>
            <DropdownItem href='/settings'>
              <Cog8ToothIcon />
              <DropdownLabel>Settings</DropdownLabel>
            </DropdownItem>
            <DropdownDivider />
            <DropdownItem href='/privacy-policy'>
              <ShieldCheckIcon />
              <DropdownLabel>Privacy policy</DropdownLabel>
            </DropdownItem>
            <DropdownItem href='/share-feedback'>
              <LightBulbIcon />
              <DropdownLabel>Share feedback</DropdownLabel>
            </DropdownItem>
            <DropdownDivider />
            <DropdownItem href='/logout'>
              <ArrowRightStartOnRectangleIcon />
              <DropdownLabel>Sign out</DropdownLabel>
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </SidebarFooter> */}
    </Sidebar>
  )
}
