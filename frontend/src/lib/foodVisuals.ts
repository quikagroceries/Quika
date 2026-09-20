"use client";

import type { StaticImageData } from "next/image";

import appleFruit from "@/assets/illustrations/apple-fruit-1.png";
import bananas from "@/assets/illustrations/bananas-1.png";
import beansImg from "@/assets/illustrations/beans.png";
import breadLoaf from "@/assets/illustrations/bread-loaf-1.png";
import broccoli from "@/assets/illustrations/broccoli.png";
import butterBlock from "@/assets/illustrations/butter-block.png";
import carrot from "@/assets/illustrations/carrot.png";
import cheeseWedge from "@/assets/illustrations/cheese-wedge-1.png";
import corn from "@/assets/illustrations/corn.png";
import crayfishImg from "@/assets/illustrations/crayfish.png";
import croissant from "@/assets/illustrations/croissant.png";
import eggsImg from "@/assets/illustrations/eggs.png";
import garlic from "@/assets/illustrations/garlic.png";
import garriImg from "@/assets/illustrations/garri.png";
import grapes from "@/assets/illustrations/grapes.png";
import honeyJar from "@/assets/illustrations/honey-jar.png";
import milkCarton from "@/assets/illustrations/milk-carton-1.png";
import mixedBerries from "@/assets/illustrations/mixed-berries.png";
import muffin from "@/assets/illustrations/muffin.png";
import okraImg from "@/assets/illustrations/okra.png";
import onion from "@/assets/illustrations/onion.png";
import pastaBag from "@/assets/illustrations/pasta-bag.png";
import pepperImg from "@/assets/illustrations/pepper.png";
import pineapple from "@/assets/illustrations/pineapple.png";
import riceBag from "@/assets/illustrations/rice-bag.png";
import roastChicken from "@/assets/illustrations/roast-chicken.png";
import tomatoesImg from "@/assets/illustrations/tomatoes.png";
import wholeFish from "@/assets/illustrations/whole-fish.png";
import yamImg from "@/assets/illustrations/yam.png";
import groceryBasket from "@/assets/illustrations/grocery-basket.png";
import netBag from "@/assets/illustrations/net-bag.png";

const KEYWORD_MAP: Array<{ regex: RegExp; image: StaticImageData }> = [
  // Newly added dedicated art - checked ahead of the shared/generic
  // regexes below so these items get their own image instead of falling
  // through to a lookalike (rice bag for beans/garri, whole fish for
  // crayfish, broccoli for okra) or the plain basket fallback (tomatoes,
  // pepper, yam, eggs had no image at all before).
  { regex: /tomato/i, image: tomatoesImg },
  { regex: /pepper/i, image: pepperImg },
  { regex: /\byam\b/i, image: yamImg },
  { regex: /\begg/i, image: eggsImg },
  { regex: /\bbeans?\b/i, image: beansImg },
  { regex: /garri/i, image: garriImg },
  { regex: /crayfish/i, image: crayfishImg },
  { regex: /okra/i, image: okraImg },
  { regex: /rice|flour|semovita|grain/i, image: riceBag },
  { regex: /fish|titus|croaker|catfish|prawn|shrimp|seafood/i, image: wholeFish },
  { regex: /chicken|turkey|meat|beef|goat|poultry|suya/i, image: roastChicken },
  { regex: /banana|plantain/i, image: bananas },
  { regex: /onion/i, image: onion },
  { regex: /carrot/i, image: carrot },
  { regex: /garlic|ginger/i, image: garlic },
  { regex: /corn|maize/i, image: corn },
  { regex: /broccoli|spinach|ugu|vegetable|greens|cabbage/i, image: broccoli },
  { regex: /apple/i, image: appleFruit },
  { regex: /pineapple/i, image: pineapple },
  { regex: /berry|berries|strawberry|raspberry/i, image: mixedBerries },
  { regex: /grape/i, image: grapes },
  { regex: /bread|loaf|toast/i, image: breadLoaf },
  { regex: /croissant|pastry/i, image: croissant },
  { regex: /muffin|cake|snack/i, image: muffin },
  { regex: /butter|margarine|spread/i, image: butterBlock },
  { regex: /cheese/i, image: cheeseWedge },
  { regex: /milk|dairy|yogurt/i, image: milkCarton },
  { regex: /honey|jam|spread|oil|palm\s*oil/i, image: honeyJar },
  { regex: /pasta|spaghetti|macaroni|noodles|indomie/i, image: pastaBag },
];

export function illustrationForItem(name: string): StaticImageData {
  const trimmed = (name || "").trim().toLowerCase();
  for (const item of KEYWORD_MAP) {
    if (item.regex.test(trimmed)) {
      return item.image;
    }
  }
  return groceryBasket;
}

export function illustrationForCategory(category: string): StaticImageData {
  const cat = (category || "").toLowerCase();
  switch (cat) {
    case "produce":
      return bananas;
    case "protein":
      return roastChicken;
    case "fish":
      return wholeFish;
    case "grains":
      return riceBag;
    case "provisions":
      return pastaBag;
    case "spices":
      return garlic;
    case "bakery":
      return breadLoaf;
    case "dairy":
      return cheeseWedge;
    default:
      return netBag;
  }
}
