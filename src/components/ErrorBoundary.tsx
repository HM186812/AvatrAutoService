import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in AVATR App:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleResetCache = () => {
    try {
      localStorage.removeItem('avatr_system_users_v2');
      localStorage.removeItem('avatr_active_user_id');
      localStorage.removeItem('avatr_leads_v2');
      localStorage.removeItem('avatr_inventory_v3');
      localStorage.removeItem('avatr_inventory_v2');
      localStorage.removeItem('avatr_stock_logs_v2');
      localStorage.removeItem('avatr_invoice_bills_v2');
      localStorage.removeItem('avatr_services_v2');
      localStorage.removeItem('avatr_testdrives_v2');
      localStorage.removeItem('avatr_vehicle_models_v1');
      localStorage.removeItem('avatr_custom_currencies_v2');
      localStorage.removeItem('avatr_logged_in');
    } catch (e) {
      console.error(e);
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-6 font-sans">
          <div className="max-w-lg w-full bg-zinc-950 border border-zinc-800 rounded-3xl p-8 shadow-2xl text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <h1 className="text-xl font-bold text-white mb-2 font-display">
              ເກີດຂໍ້ຜິດພາດໃນການໂຫຼດລະບົບ
            </h1>
            <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
              ລະບົບພົບບັນຫາຂັດຂ້ອງຊົ່ວຄາວ. ທ່ານສາມາດກົດປຸ່ມໂຫຼດໃໝ່ ຫຼື ລ້າງແຄຊຂໍ້ມູນເພື່ອເລີ່ມຕົ້ນລະບົບໃໝ່ໄດ້.
            </p>

            {this.state.error && (
              <div className="mb-6 p-4 rounded-xl bg-zinc-900 border border-zinc-800/80 text-left font-mono text-xs text-rose-300 max-h-36 overflow-auto">
                <p className="font-bold text-zinc-400 mb-1">ລາຍລະອຽດຂໍ້ຜິດພາດ:</p>
                <p className="break-all">{this.state.error.toString()}</p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white text-black font-semibold text-sm hover:bg-zinc-200 transition-all shadow-lg"
              >
                <RefreshCw className="w-4 h-4" />
                <span>ໂຫຼດລະບົບໃໝ່</span>
              </button>

              <button
                onClick={this.handleResetCache}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-zinc-900 text-zinc-300 hover:text-white border border-zinc-800 hover:border-zinc-700 font-semibold text-sm transition-all"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>ລ້າງແຄຊ & ເລີ່ມໃໝ່</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
