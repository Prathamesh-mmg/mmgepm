// src/pages/admin/SettingsPage.tsx
import { Settings, Bell, Database, Shield, Globe } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-xl font-semibold">System Settings</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { icon: Bell,     label: 'Notification Templates',  desc: 'Configure email and in-app notifications'  },
          { icon: Shield,   label: 'Role Permissions',        desc: 'Fine-tune module access per role'           },
          { icon: Globe,    label: 'Countries & SBUs',        desc: 'Manage lookup values'                       },
          { icon: Database, label: 'Database Maintenance',    desc: 'Audit logs, backups and cleanup'            },
        ].map(item => (
          <div key={item.label} className="card p-5 flex items-start gap-4 hover:shadow-card-hover transition-all cursor-pointer">
            <div className="w-10 h-10 rounded-xl bg-brand-400/10 flex items-center justify-center flex-shrink-0">
              <item.icon className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <p className="font-medium">{item.label}</p>
              <p className="text-sm text-[var(--text-secondary)] mt-0.5">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card p-6">
        <h2 className="font-semibold mb-4">General Settings</h2>
        <div className="space-y-4 text-sm">
          <div className="flex items-center justify-between py-3 border-b border-[var(--border)]">
            <div>
              <p className="font-medium">System Name</p>
              <p className="text-[var(--text-secondary)]">MMG EPM</p>
            </div>
            <button className="btn-outline btn-sm">Edit</button>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-[var(--border)]">
            <div>
              <p className="font-medium">Default Time Zone</p>
              <p className="text-[var(--text-secondary)]">Africa/Nairobi (EAT +3)</p>
            </div>
            <button className="btn-outline btn-sm">Edit</button>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium">Currency</p>
              <p className="text-[var(--text-secondary)]">USD — United States Dollar</p>
            </div>
            <button className="btn-outline btn-sm">Edit</button>
          </div>
        </div>
      </div>
    </div>
  );
}
