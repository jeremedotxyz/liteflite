import { createIcons, ArrowLeft, ArrowRight, Box, Download, Eraser, Eye, Folder, FolderOpen, LockKeyhole, LogOut, Maximize, PanelTop, Plus, Ruler, Scan, Search, Settings2, SlidersHorizontal, Square, Upload, UserPlus, X } from 'lucide';
const icons={ArrowLeft,ArrowRight,Box,Download,Eraser,Eye,Folder,FolderOpen,LockKeyhole,LogOut,Maximize,PanelTop,Plus,Ruler,Scan,Search,Settings2,SlidersHorizontal,Square,Upload,UserPlus,X};
export const refreshIcons = () => createIcons({ icons, attrs: { 'stroke-width': 1.7, 'aria-hidden': 'true' } });
export async function api(path, options = {}) {
  const response = await fetch('/api' + path, { credentials: 'same-origin', ...options,
    headers: options.body instanceof FormData ? options.headers : { 'Content-Type': 'application/json', ...options.headers }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && path !== '/login') location.replace('./login.html');
    throw new Error(data.error || 'The portal could not complete this request.');
  }
  return data;
}
export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
export const fileSize = size => size > 1024 * 1024 ? (size / 1024 / 1024).toFixed(1) + ' MB' : Math.max(1, Math.round(size / 1024)) + ' KB';
export const fileDate = value => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value.replace(' ', 'T') + (value.includes('Z') ? '' : 'Z')));
