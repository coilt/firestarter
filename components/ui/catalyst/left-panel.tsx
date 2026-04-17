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
            <Avatar src='/tailwind-logo.svg' />
            <SidebarLabel>Firestarter</SidebarLabel>
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
          <SidebarItem>
            <button
              onClick={onSave}
              disabled={saveState === 'saving'}
              className='w-full rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200'
            >
              {SAVE_LABEL[saveState]}
            </button>
          </SidebarItem>
        </SidebarSection>
      </SidebarBody>
      <SidebarFooter className='max-lg:hidden'>
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
      </SidebarFooter>
    </Sidebar>
  )
}
