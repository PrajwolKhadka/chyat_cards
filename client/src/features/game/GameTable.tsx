"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import Card from "@/components/cards/Card";
import Hand from "@/components/cards/Hand";
import { CARD_HEX, COLOR_LABEL } from "@/lib/cardAssets";
import type { Card as CardType, Color, GameView, RoomView } from "@/lib/types";
import { useRoom } from "@/features/room/RoomProvider";
import ColorPicker from "./ColorPicker";
import EmoteBubbles from "./EmoteBubbles";
import EmoteSheet from "./EmoteSheet";
import OpponentChip from "./OpponentChip";
import TurnTimer from "./TurnTimer";
import WinnerOverlay from "./WinnerOverlay";

const btn =
  "flex h-12 flex-1 items-center justify-center rounded-2xl px-3 text-sm font-bold shadow-sm transition-all active:scale-[0.97] disabled:opacity-50";

export default function GameTable({
  room,
  game,
}: {
  room: RoomView;
  game: GameView;
}) {
  const {
    play,
    draw,
    pass,
    uno,
    catchUno,
    accept4,
    challenge4,
    sendEmote,
    leave,
    bubbles,
  } = useRoom();

  const router = useRouter();

  const [wild, setWild] = useState<CardType | null>(null);
  const [emotesOpen, setEmotesOpen] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);

  const me = room.you;
  const playing = game.status === "playing";

  const myTurn = playing && game.currentPlayerId === me && !game.pendingDraw4;

  const canDraw = myTurn && !game.drawnCardId;
  const myCount = game.hand.length;

  const showUno =
    playing && myCount >= 1 && myCount <= 2 && !game.unoCalled.includes(me);

  // Opponents in seating order, starting with the player after you.
  const opponents = useMemo(() => {
    const n = room.seats.length;
    const mine = room.seats.findIndex((s) => s.playerId === me);

    return Array.from(
      { length: n - 1 },
      (_, i) => room.seats[(mine + 1 + i) % n],
    );
  }, [room.seats, me]);

  const current = room.seats.find((s) => s.playerId === game.currentPlayerId);

  const victim = game.pendingDraw4
    ? room.seats.find((s) => s.playerId === game.pendingDraw4?.victimId)
    : undefined;

  let message: string;

  if (!playing) {
    message = "Game over";
  } else if (game.pendingDraw4) {
    message = game.canRespondDraw4
      ? "Wild +4! Take 4 cards or challenge it"
      : `${victim?.name ?? "A player"} is deciding`;
  } else if (myTurn) {
    message = game.drawnCardId
      ? "Play the card you drew, or pass"
      : "Your turn";
  } else {
    message = `${current?.name ?? "A player"} is playing`;
  }

  function onCard(card: CardType) {
    if (!game.playableIds.includes(card.id)) return;

    if (card.kind === "wild") {
      setWild(card);
    } else {
      void play(card.id);
    }
  }

  function onPickColor(color: Color) {
    if (wild) {
      void play(wild.id, color);
    }

    setWild(null);
  }

  async function onLeave() {
    await leave();
    router.push("/");
  }

  function confirmLeave() {
    setLeaveConfirmOpen(true);
  }

  const statusStyle = game.canRespondDraw4
    ? "border-sindoor/20 bg-sindoor/10 text-sindoor"
    : myTurn
      ? "border-terrace/20 bg-terrace/10 text-terrace"
      : "border-dhaka/10 bg-dhaka/5 text-dhaka/65";

  return (
    <main className="relative mx-auto flex h-[100dvh] w-full max-w-lg flex-col overflow-hidden overscroll-none bg-[#FFF8EC] text-dhaka">
      {/* Background texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.22]"
        style={{
          backgroundImage: "radial-gradient(#C7A98B 0.7px, transparent 0.7px)",
          backgroundSize: "17px 17px",
        }}
      />

      {/* Header */}
      <header className="relative z-10 flex shrink-0 items-center justify-between gap-2 px-4 pb-2 pt-[max(10px,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={confirmLeave}
          className="flex h-10 shrink-0 items-center gap-2 rounded-full border border-dhaka/10 bg-white/80 px-4 text-xs font-bold text-dhaka shadow-sm transition-all hover:bg-white active:scale-95"
        >
          <span className="text-base leading-none">←</span>
          Leave
        </button>

        <div className="flex min-w-0 flex-col items-center">
          <p className="font-display text-lg font-black tracking-[0.25em] text-sindoor">
            {room.code}
          </p>

          <p className="whitespace-nowrap text-[8px] font-bold uppercase tracking-[0.3em] text-dhaka/40">
            Uno Chyat Cards
          </p>
        </div>

        <div className="flex h-10 min-w-10 shrink-0 items-center justify-center rounded-full border border-dhaka/10 bg-white/80 px-3 shadow-sm">
          <TurnTimer
            endsAt={game.turnEndsAt}
            urgent={myTurn || game.canRespondDraw4}
          />
        </div>
      </header>

      {/* Opponents */}
      <section className="relative z-10 shrink-0 px-4 pb-2 pt-1">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[9px] font-extrabold uppercase tracking-[0.22em] text-dhaka/45">
            Playing with
          </p>

          <p className="text-[10px] font-semibold text-dhaka/40">
            {room.seats.length} players
          </p>
        </div>

        {/* Reserve enough height for opponent cards and player names */}
        <div className="no-scrollbar flex min-h-[116px] shrink-0 items-center gap-2 overflow-x-auto overflow-y-hidden rounded-2xl border border-dhaka/10 bg-white/55 px-3 py-2">
          {opponents.length > 0 ? (
            opponents.map((seat) => (
              <OpponentChip
                key={seat.playerId}
                seat={seat}
                active={playing && seat.playerId === game.currentPlayerId}
                called={game.unoCalled.includes(seat.playerId)}
                vulnerable={game.unoVulnerable === seat.playerId}
                onCatch={() => void catchUno(seat.playerId)}
              />
            ))
          ) : (
            <p className="w-full text-center text-xs text-dhaka/40">
              Waiting for other players
            </p>
          )}
        </div>
      </section>

      {/* Main playing area */}
      <section className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col px-3 py-2">
        <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden rounded-[28px] border border-[#DCCAB0] bg-[#F7EEDC] shadow-[inset_0_2px_12px_rgba(100,70,40,0.045)]">
          {/* Table border */}
          <div className="pointer-events-none absolute inset-2 rounded-[25px] border border-dhaka/[0.06]" />

          {/* Table decorations */}
          <div className="pointer-events-none absolute left-4 top-4 text-sm text-terrace/20">
            ✳
          </div>

          <div className="pointer-events-none absolute right-4 top-4 text-sm text-terrace/20">
            ✳
          </div>

          <div className="pointer-events-none absolute bottom-4 left-4 text-sm text-terrace/20">
            ✳
          </div>

          <div className="pointer-events-none absolute bottom-4 right-4 text-sm text-terrace/20">
            ✳
          </div>

          {/* Turn status */}
          <div className="relative z-10 mb-3 flex shrink-0 flex-col items-center gap-2 px-3">
            <span
              className={`rounded-full border px-4 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] ${statusStyle}`}
            >
              {game.pendingDraw4 && game.canRespondDraw4
                ? "Your decision"
                : myTurn
                  ? "Your turn"
                  : "Game in progress"}
            </span>

            <p className="max-w-[270px] text-center text-sm font-bold text-dhaka/75">
              {message}
            </p>
          </div>

          {/* Card piles */}
          <div className="relative z-10 flex shrink-0 items-center justify-center gap-6 sm:gap-10">
            {/* Draw pile */}
            <div className="flex flex-col items-center gap-3">
              <span className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-dhaka/40">
                Draw pile
              </span>

              <button
                type="button"
                disabled={!canDraw}
                onClick={() => void draw()}
                aria-label="Draw a card"
                className={`relative rounded-xl transition-all duration-200 ${
                  canDraw
                    ? "turn-pulse cursor-pointer hover:-translate-y-2"
                    : "cursor-not-allowed opacity-90"
                }`}
              >
                <div className="rounded-xl shadow-[0_7px_15px_rgba(60,30,30,0.16)]">
                  <Card card={null} width={88} />
                </div>

                <span className="absolute -bottom-3 left-1/2 flex h-6 min-w-8 -translate-x-1/2 items-center justify-center rounded-full border-2 border-[#F7EEDC] bg-dhaka px-2 text-[10px] font-black text-white">
                  {game.drawPileCount}
                </span>
              </button>
            </div>

            {/* Discard pile */}
            <div className="flex flex-col items-center gap-3">
              <span className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-dhaka/40">
                Discard pile
              </span>

              <div
                className="relative rounded-xl transition-shadow duration-200"
                style={{
                  boxShadow: `0 0 0 4px ${CARD_HEX[game.currentColor]}, 0 8px 18px rgba(60,30,30,0.15)`,
                }}
              >
                <Card card={game.topCard} width={96} />

                <span
                  aria-label={
                    game.direction === 1 ? "Clockwise" : "Counter clockwise"
                  }
                  className="absolute -right-3 -top-3 flex h-9 w-9 items-center justify-center rounded-full border border-dhaka/10 bg-white text-xl text-dhaka shadow-md"
                >
                  {game.direction === 1 ? "↻" : "↺"}
                </span>
              </div>
            </div>
          </div>

          {/* Current colour */}
          <div className="relative z-10 mt-4 flex shrink-0 items-center gap-2 rounded-full border border-dhaka/10 bg-white/65 px-4 py-2">
            <span
              className="h-3 w-3 rounded-full border border-black/10 shadow-sm"
              style={{
                backgroundColor: CARD_HEX[game.currentColor],
              }}
            />

            <p className="text-[11px] font-bold text-dhaka/65">
              {COLOR_LABEL[game.currentColor].ne}
              <span className="mx-1 text-dhaka/30">·</span>
              {COLOR_LABEL[game.currentColor].en}
            </p>
          </div>
        </div>
      </section>

      {/* Player actions */}
      <section className="relative z-10 flex shrink-0 items-center gap-2 px-4 pb-2 pt-1">
        {game.canRespondDraw4 ? (
          <>
            <button
              type="button"
              className={`${btn} border border-sindoor/20 bg-sindoor text-white`}
              onClick={() => void accept4()}
            >
              Take 4 cards
            </button>

            <button
              type="button"
              className={`${btn} border border-[#D89C00] bg-marigold text-ink`}
              onClick={() => void challenge4()}
            >
              Challenge
            </button>
          </>
        ) : (
          <>
            {myTurn && game.drawnCardId && (
              <button
                type="button"
                className={`${btn} bg-dhaka text-white`}
                onClick={() => void pass()}
              >
                Pass turn →
              </button>
            )}

            {showUno && (
              <button
                type="button"
                className={`${btn} border border-sindoor/20 bg-sindoor text-white`}
                onClick={() => void uno()}
              >
                UNO!
              </button>
            )}
          </>
        )}

        <button
          type="button"
          aria-label="Send a reaction"
          onClick={() => setEmotesOpen(true)}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-dhaka/10 bg-white text-2xl shadow-sm transition-all hover:-translate-y-0.5 active:scale-95"
        >
          😀
        </button>
      </section>

      {/* Player hand */}
      <section className="relative z-10 shrink-0 border-t border-dhaka/10 bg-[#F5EAD8]/90 pb-[max(5px,env(safe-area-inset-bottom))] pt-2">
        <div className="mb-1 flex items-center justify-between px-5">
          <p className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-dhaka/45">
            Your hand
          </p>

          <p className="rounded-full bg-white/70 px-2.5 py-1 text-[9px] font-bold text-dhaka/55">
            {myCount} {myCount === 1 ? "card" : "cards"}
          </p>
        </div>

        <Hand
          cards={game.hand}
          playableIds={game.playableIds}
          onPlay={onCard}
        />
      </section>

      {/* Leave confirmation modal */}
      {leaveConfirmOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-dhaka/60 px-5 backdrop-blur-[3px]"
          onClick={() => setLeaveConfirmOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="leave-title"
            className="w-full max-w-sm overflow-hidden rounded-[28px] border border-dhaka/10 bg-[#FFFEFA] shadow-2xl animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-1.5 bg-sindoor" />

            <div className="p-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sindoor/10 text-2xl">
                🚪
              </div>

              <h2
                id="leave-title"
                className="text-xl font-extrabold text-dhaka"
              >
                Leave the game?
              </h2>

              <p className="mt-2 text-sm leading-relaxed text-ink/60">
                Are you sure you want to leave this room? The game will continue
                without you.
              </p>

              <div className="mt-7 flex gap-3">
                <button
                  type="button"
                  onClick={() => setLeaveConfirmOpen(false)}
                  className="h-12 flex-1 rounded-2xl border border-dhaka/15 bg-white font-bold text-dhaka transition-colors hover:bg-dhaka/5 active:scale-95"
                >
                  Stay
                </button>

                <button
                  type="button"
                  onClick={() => void onLeave()}
                  className="h-12 flex-1 rounded-2xl bg-sindoor font-bold text-white shadow-sm transition-all hover:bg-sindoor/90 active:scale-95"
                >
                  Leave game
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Other modals and overlays */}
      <ColorPicker
        open={wild !== null}
        onPick={onPickColor}
        onClose={() => setWild(null)}
      />

      <EmoteSheet
        open={emotesOpen}
        onPick={(emote) => {
          void sendEmote(emote);
          setEmotesOpen(false);
        }}
        onClose={() => setEmotesOpen(false)}
      />

      <EmoteBubbles bubbles={bubbles} />

      {!playing && (
        <WinnerOverlay room={room} game={game} onLeave={() => void onLeave()} />
      )}
    </main>
  );
}
