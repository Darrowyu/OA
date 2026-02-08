import { Smartphone, Tablet, Laptop, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { UserDevice } from '@/types/profile';

interface DevicesTabProps {
  devices: UserDevice[];
  loading: boolean;
  revokeDevice: (deviceId: string) => Promise<unknown>;
  revokeAllDevices: () => Promise<unknown>;
}

export function DevicesTab({ devices, loading, revokeDevice, revokeAllDevices }: DevicesTabProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>登录设备</CardTitle>
            <CardDescription>管理您的登录设备</CardDescription>
          </div>
          <Button variant="outline" onClick={revokeAllDevices}>
            <Trash2 className="h-4 w-4 mr-2" />
            踢出其他设备
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {devices.length === 0 ? (
            <p className="text-center text-slate-500 py-8">暂无设备记录</p>
          ) : (
            devices.map((device) => (
              <div key={device.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-slate-100 rounded-lg">
                    {device.deviceType === 'mobile' ? (
                      <Smartphone className="h-6 w-6 text-slate-600" />
                    ) : device.deviceType === 'tablet' ? (
                      <Tablet className="h-6 w-6 text-slate-600" />
                    ) : (
                      <Laptop className="h-6 w-6 text-slate-600" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{device.deviceName}</span>
                      {device.isCurrent && (
                        <Badge variant="secondary" className="text-xs">
                          当前设备
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-500">
                      {device.browser} · {device.os}
                      {device.ipAddress && ` · ${device.ipAddress}`}
                    </p>
                    <p className="text-xs text-slate-400">
                      最后活跃: {new Date(device.lastActiveAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                {!device.isCurrent && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => revokeDevice(device.deviceId)}
                    disabled={loading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
