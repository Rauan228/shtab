'use client';

import Link from 'next/link';
import { useUi } from '../lib/ui';
import { BuildingIcon, CardIcon, ChartIcon, ChevronRight } from './icons';

/** Mobile «Ещё» hub — desktop has these items in the sidebar. */
export function Settings() {
  const { href } = useUi();

  return (
    <div className="set">
      <Link href={href('/reports')} className="card card-pad more-row">
        <span className="more-ic">
          <ChartIcon />
        </span>
        <span>
          <div className="more-t">Отчёты</div>
          <div className="more-s">Загрузка, доход, отмены и откуда пришла бронь</div>
        </span>
        <span className="more-go">
          <ChevronRight />
        </span>
      </Link>
      <Link href={href('/objects')} className="card card-pad more-row">
        <span className="more-ic">
          <BuildingIcon />
        </span>
        <span>
          <div className="more-t">Объекты</div>
          <div className="more-s">Квартиры, цены, фото, инструкции заезда и оплата от гостей</div>
        </span>
        <span className="more-go">
          <ChevronRight />
        </span>
      </Link>
      <Link href={href('/plan')} className="card card-pad more-row">
        <span className="more-ic">
          <CardIcon />
        </span>
        <span>
          <div className="more-t">Тариф и лимиты</div>
          <div className="more-s">Сколько квартир и диалогов осталось в подписке</div>
        </span>
        <span className="more-go">
          <ChevronRight />
        </span>
      </Link>
    </div>
  );
}
