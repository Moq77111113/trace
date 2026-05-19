<script lang="ts" module>
  import Activity      from 'lucide-svelte/icons/activity';
  import ArrowRight    from 'lucide-svelte/icons/arrow-right';
  import Bell          from 'lucide-svelte/icons/bell';
  import Calendar      from 'lucide-svelte/icons/calendar';
  import Camera        from 'lucide-svelte/icons/camera';
  import Check         from 'lucide-svelte/icons/check';
  import ChevronDown   from 'lucide-svelte/icons/chevron-down';
  import ChevronRight  from 'lucide-svelte/icons/chevron-right';
  import ChevronUp     from 'lucide-svelte/icons/chevron-up';
  import Clock         from 'lucide-svelte/icons/clock';
  import Copy          from 'lucide-svelte/icons/copy';
  import Download      from 'lucide-svelte/icons/download';
  import Eye           from 'lucide-svelte/icons/eye';
  import File          from 'lucide-svelte/icons/file';
  import Filter        from 'lucide-svelte/icons/filter';
  import Folder        from 'lucide-svelte/icons/folder';
  import GripVertical  from 'lucide-svelte/icons/grip-vertical';
  import History       from 'lucide-svelte/icons/history';
  import LifeBuoy      from 'lucide-svelte/icons/life-buoy';
  import Home          from 'lucide-svelte/icons/home';
  import Inbox         from 'lucide-svelte/icons/inbox';
  import Key           from 'lucide-svelte/icons/key';
  import Map           from 'lucide-svelte/icons/map';
  import Menu          from 'lucide-svelte/icons/menu';
  import MoreHorizontal from 'lucide-svelte/icons/more-horizontal';
  import Moon          from 'lucide-svelte/icons/moon';
  import Paperclip     from 'lucide-svelte/icons/paperclip';
  import Pause         from 'lucide-svelte/icons/pause';
  import Play          from 'lucide-svelte/icons/play';
  import Plug          from 'lucide-svelte/icons/plug';
  import Plus          from 'lucide-svelte/icons/plus';
  import RefreshCw     from 'lucide-svelte/icons/refresh-cw';
  import Search        from 'lucide-svelte/icons/search';
  import Server        from 'lucide-svelte/icons/server';
  import Settings      from 'lucide-svelte/icons/settings';
  import Square        from 'lucide-svelte/icons/square';
  import Sun           from 'lucide-svelte/icons/sun';
  import Tag           from 'lucide-svelte/icons/tag';
  import Trash         from 'lucide-svelte/icons/trash';
  import Upload        from 'lucide-svelte/icons/upload';
  import X             from 'lucide-svelte/icons/x';
  import Zap           from 'lucide-svelte/icons/zap';

  const registry = {
    Activity,
    ArrowRight,
    Bell,
    Calendar,
    Camera,
    Check,
    ChevronDown,
    ChevronRight,
    ChevronUp,
    Clock,
    Copy,
    Download,
    Eye,
    File,
    Filter,
    Folder,
    GripVertical,
    History,
    LifeBuoy,
    Home,
    Inbox,
    Key,
    Map,
    Menu,
    MoreHorizontal,
    Moon,
    Paperclip,
    Pause,
    Play,
    Plug,
    Plus,
    RefreshCw,
    Search,
    Server,
    Settings,
    Square,
    Sun,
    Tag,
    Trash,
    Upload,
    X,
    Zap
  };

  export type IconName = keyof typeof registry;
</script>

<script lang="ts">
  type Props = {
    name:   IconName;
    size?:  number;
    class?: string;
  };

  let { name, size = 14, class: cls = '' }: Props = $props();

  const Component = $derived(registry[name]);
</script>

<Component {size} class={cls} strokeWidth={1.6} />
